import { SubEvent } from "sub-events";

import { broadCastNum, minFwVer } from "./constants.js";
import { Types } from "./index.js";
import { log } from "./utils/logging.js";
import { Queue } from "./utils/queue.js";
import {
  AdminMessage,
  Channel,
  ConfigType,
  FromRadio,
  HardwareMessage,
  Level,
  MeshPacket,
  ModuleConfigType,
  MyNodeInfo,
  Position,
  Routing,
  Telemetry,
  ToRadio,
  User,
  Waypoint
} from "./generated/imports.js";
import { messages } from "./generated/index.js";

/** Base class for connection methods to extend */
export abstract class IMeshDevice {
  /** Abstract property that states the connection type */
  protected abstract connType: string;

  /** Logs to the console and the logging event emitter */
  protected log: (
    scope: Types.EmitterScope,
    emitter: Types.Emitter,
    message: string,
    level: Level,
    packet?: Uint8Array
  ) => void;

  /** Describes the current state of the device */
  protected deviceStatus: Types.DeviceStatusEnum;

  /** Describes the current state of the device */
  protected isConfigured: boolean;

  /** Device's node number */
  private myNodeInfo: messages.MyNodeInfo;

  /** Randomly generated number to ensure confiuration lockstep */
  public configId: number;

  /**
   * Keeps track of all requests sent to the radio that have callbacks TODO:
   * Update description
   */
  public queue: Queue;

  /** Sets the library-wide logging level */
  public logLevel: Level = "WARNING";

  constructor(configId?: number) {
    this.log = (scope, emitter, message, level, packet): void => {
      log(scope, emitter, message, level, this.logLevel);
      this.onLogEvent.emit({
        scope,
        emitter,
        message,
        level,
        packet,
        date: new Date()
      });
    };

    this.deviceStatus = Types.DeviceStatusEnum.DEVICE_DISCONNECTED;
    this.isConfigured = false;
    this.myNodeInfo = MyNodeInfo.createValue({}); //TODO: maybe init default?
    this.configId = configId ?? this.generateRandId();
    this.queue = new Queue();

    this.onDeviceStatus.subscribe((status) => {
      this.deviceStatus = status;
      if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURED)
        this.isConfigured = true;
      else if (status === Types.DeviceStatusEnum.DEVICE_CONFIGURING)
        this.isConfigured = false;
    });

    this.onMyNodeInfo.subscribe((myNodeInfo) => {
      this.myNodeInfo = myNodeInfo;
    });
  }

  /** Abstract method that writes data to the radio */
  protected abstract writeToRadio(data: Uint8Array): Promise<void>;

  /** Abstract method that connects to the radio */
  protected abstract connect(
    parameters: Types.ConnectionParameters
  ): Promise<void>;

  /** Abstract method that disconnects from the radio */
  protected abstract disconnect(): void;

  /** Abstract method that pings the radio */
  protected abstract ping(): Promise<boolean>;

  /**
   * Fires when a new FromRadio message has been received from the device
   *
   * @event onLogEvent
   */
  public readonly onLogEvent = new SubEvent<Types.LogEventPacket>();

  /**
   * Fires when a new FromRadio message has been received from the device
   *
   * @event onFromRadio
   */
  public readonly onFromRadio = new SubEvent<messages.FromRadio>();

  /**
   * Fires when a new FromRadio message containing a Data packet has been
   * received from the device
   *
   * @event onMeshPacket
   */
  public readonly onMeshPacket = new SubEvent<messages.MeshPacket>();

  /**
   * Fires when a new MyNodeInfo message has been received from the device
   *
   * @event onMyNodeInfo
   */
  public readonly onMyNodeInfo = new SubEvent<messages.MyNodeInfo>();

  /**
   * Fires when a new MeshPacket message containing a NodeInfo packet has been
   * received from device
   *
   * @event onNodeInfoPacket
   */
  public readonly onNodeInfoPacket = new SubEvent<Types.NodeInfoPacket>();

  /**
   * Fires when a new MeshPacket message containing a User packet has been
   * received from device
   *
   * @event onUserPacket
   */
  public readonly onUserPacket = new SubEvent<Types.UserPacket>();

  /**
   * Fires when a new Channel message is recieved
   *
   * @event onChannelPacket
   */
  public readonly onChannelPacket = new SubEvent<Types.ChannelPacket>();

  /**
   * Fires when a new Config message is recieved
   *
   * @event onConfigPacket
   */
  public readonly onConfigPacket = new SubEvent<Types.ConfigPacket>();

  /**
   * Fires when a new ModuleConfig message is recieved
   *
   * @event onModuleConfigPacket
   */
  public readonly onModuleConfigPacket =
    new SubEvent<Types.ModuleConfigPacket>();

  /**
   * Fires when a new MeshPacket message containing a Ping packet has been
   * received from device
   *
   * @event onPingPacket
   */
  public readonly onPingPacket = new SubEvent<Types.PingPacket>();

  /**
   * Fires when a new MeshPacket message containing a IP Tunnel packet has been
   * received from device
   *
   * @event onIpTunnelPacket
   */

  public readonly onIpTunnelPacket = new SubEvent<Types.IpTunnelPacket>();

  /**
   * Fires when a new MeshPacket message containing a Serial packet has been
   * received from device
   *
   * @event onSerialPacket
   */

  public readonly onSerialPacket = new SubEvent<Types.SerialPacket>();
  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet
   * has been received from device
   *
   * @event onStoreForwardPacket
   */
  public readonly onStoreForwardPacket =
    new SubEvent<Types.StoreForwardPacket>();

  /**
   * Fires when a new MeshPacket message containing a Store and Forward packet
   * has been received from device
   *
   * @event onRangeTestPacket
   */
  public readonly onRangeTestPacket = new SubEvent<Types.RangeTestPacket>();

  /**
   * Fires when a new MeshPacket message containing a Telemetry packet has been
   * received from device
   *
   * @event onTelemetryPacket
   */
  public readonly onTelemetryPacket = new SubEvent<Types.TelemetryPacket>();

  /**
   * Fires when a new MeshPacket message containing a Private packet has been
   * received from device
   *
   * @event onPrivatePacket
   */
  public readonly onPrivatePacket = new SubEvent<Types.PrivatePacket>();

  /**
   * Fires when a new MeshPacket message containing a ATAK packet has been
   * received from device
   *
   * @event onAtakPacket
   */
  public readonly onAtakPacket = new SubEvent<Types.AtakPacket>();

  /**
   * Fires when a new MeshPacket message containing a Routing packet has been
   * received from device
   *
   * @event onRoutingPacket
   */
  public readonly onRoutingPacket = new SubEvent<Types.RoutingPacket>();

  /**
   * Fires when a new MeshPacket message containing a Position packet has been
   * received from device
   *
   * @event onPositionPacket
   */
  public readonly onPositionPacket = new SubEvent<Types.PositionPacket>();

  /**
   * Fires when a new MeshPacket message containing a Text packet has been
   * received from device
   *
   * @event onMessagePacket
   */
  public readonly onMessagePacket = new SubEvent<Types.MessagePacket>();

  /**
   * Fires when a new MeshPacket message containing a Remote Hardware packet has
   * been received from device
   *
   * @event onRemoteHardwarePacket
   */
  public readonly onRemoteHardwarePacket =
    new SubEvent<Types.RemoteHardwarePacket>();

  /**
   * Fires when a new MeshPacket message containing a Waypoint packet has been
   * received from device
   *
   * @event onWaypointPacket
   */
  public readonly onWaypointPacket = new SubEvent<Types.WaypointPacket>();

  /**
   * Fires when the devices connection or configuration status changes
   *
   * @event onDeviceStatus
   */
  public readonly onDeviceStatus = new SubEvent<Types.DeviceStatusEnum>();

  /**
   * Fires when a new FromRadio message containing a LogRecord packet has been
   * received from device
   *
   * @event onLogRecord
   */
  public readonly onLogRecord = new SubEvent<messages.LogRecord>();

  /**
   * Fires when the device receives a meshPacket, returns a timestamp
   *
   * @event onMeshHeartbeat
   */
  public readonly onMeshHeartbeat = new SubEvent<Date>();

  /**
   * Outputs any debug log data (currently serial connections only)
   *
   * @event onDeviceDebugLog
   */
  public readonly onDeviceDebugLog = new SubEvent<Uint8Array>();

  /**
   * Fires when the device receives a Metadata packet
   *
   * @event onDeviceMetadataPacket
   */
  public readonly onDeviceMetadataPacket =
    new SubEvent<Types.DeviceMetadataPacket>();

  /**
   * Sets the desired logging level for this device
   *
   * @param {LogRecord_Level} level Desired logging level
   */
  public setLogLevel(level: Level): void {
    this.logLevel = level;
  }

  /**
   * Sends a text over the radio
   *
   * @param {string} text Message to send
   * @param {number} [destinationNum] Node number of the destination node
   * @param {boolean} [wantAck=false] Whether or not acknowledgement is wanted.
   *   Default is `false`
   * @param {Types.channelNumber} [channel=Types.ChannelNumber.PRIMARY] Channel
   *   number to send to. Default is `Types.ChannelNumber.PRIMARY`
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   * @returns {Promise<void>}
   */
  public sendText(
    text: string,
    destinationNum?: number,
    wantAck = false,
    channel: Types.ChannelNumber = Types.ChannelNumber.PRIMARY,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.sendText,
      `📤 Sending message to ${
        destinationNum ?? "broadcast"
      } on channel ${channel.toString()}`,
      "DEBUG"
    );

    const enc = new TextEncoder();

    return this.sendPacket(
      enc.encode(text),
      "TEXT_MESSAGE_APP",
      destinationNum,
      wantAck,
      channel,
      undefined,
      true,
      callback
    );
  }

  /**
   * Sends a text over the radio
   *
   * @param {Waypoint} waypoint Desired waypoint to send
   * @param {number} destinationNum Node number of the destination node
   * @param {boolean} wantAck Whether or not acknowledgement is wanted
   * @param {Types.ChannelNumber} [channel=Types.ChannelNumber.PRIMARY] Channel
   *   to send on. Default is `Types.ChannelNumber.PRIMARY`
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   * @returns {Promise<void>}
   */
  public sendWaypoint(
    waypoint: messages.Waypoint,
    destinationNum?: number,
    wantAck = false,
    channel: Types.ChannelNumber = Types.ChannelNumber.PRIMARY,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.sendWaypoint,
      `📤 Sending waypoint to ${
        destinationNum ?? "broadcast"
      } on channel ${channel.toString()}`,
      "DEBUG"
    );

    return this.sendPacket(
      Waypoint.encodeBinary(waypoint),
      "WAYPOINT_APP",
      destinationNum,
      wantAck,
      channel,
      undefined,
      true,
      callback,
      undefined
    );
  }

  /**
   * Sends packet over the radio
   *
   * @param {Uint8Array} byteData Raw bytes to send
   * @param {PortNum} portNum DataType Enum of protobuf data type
   * @param {number} [destinationNum] Node number of the destination node
   * @param {boolean} [wantAck=false] Whether or not acknowledgement is wanted.
   *   Default is `false`
   * @param {Types.ChannelNumber} [channel=0] Channel to send. Default is `0`
   * @param {boolean} [wantResponse=false] Used for testing, requests recpipient
   *   to respond in kind with the same type of request. Default is `false`
   * @param {boolean} [echoResponse=false] Sends event back to client. Default
   *   is `false`. Default is `false`
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   * @param {number} [emoji=0] Used for message reactions. Default is `0`
   * @param {number} [replyId=0] Used to reply to a message. Default is `0`
   */
  public async sendPacket(
    byteData: Uint8Array,
    portNum: messages.PortNum,
    destinationNum?: number,
    wantAck = false,
    channel: Types.ChannelNumber = Types.ChannelNumber.PRIMARY,
    wantResponse = false,
    echoResponse = false,
    callback?: (id: number) => Promise<void>,
    emoji = 0,
    replyId = 0
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.sendPacket,
      `📤 Sending ${portNum} to ${destinationNum ?? "broadcast"}`,
      "TRACE"
    );

    const meshPacket = MeshPacket.createValue({
      payloadVariant: {
        field: "decoded",
        value: {
          payload: byteData,
          portnum: portNum,
          wantResponse,
          emoji,
          replyId,
          dest: 0, //change this!
          requestId: 0, //change this!
          source: 0 //change this!
        }
      },
      from: this.myNodeInfo.myNodeNum,
      to: destinationNum ? destinationNum : broadCastNum,
      id: this.generateRandId(),
      wantAck: wantAck,
      channel
    });

    const toRadio = ToRadio.encodeBinary({
      payloadVariant: {
        field: "packet",
        value: meshPacket
      }
    });

    if (echoResponse) {
      await this.handleMeshPacket(meshPacket);
    }
    await this.sendRaw(meshPacket.id, toRadio, callback);
  }

  /**
   * Sends raw packet over the radio
   *
   * @param {number} id Unique packet ID
   * @param {Uint8Array} toRadio Binary data to send
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async sendRaw(
    id: number,
    toRadio: Uint8Array,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    if (toRadio.length > 512) {
      this.log(
        Types.EmitterScope.iMeshDevice,
        Types.Emitter.sendRaw,
        `Message longer than 512 bytes, it will not be sent!`,
        "WARNING"
      );
    } else {
      this.queue.push({
        id,
        data: toRadio,
        callback:
          callback ??
          (async () => {
            return Promise.resolve();
          }),
        waitingAck: false
      });

      await this.queue.processQueue(async (data) => {
        await this.writeToRadio(data);
      });
    }
  }

  /**
   * Writes config to device
   *
   * @param {Config} config Config object
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async setConfig(
    config: messages.Config,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.setConfig,
      `Setting config ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    let configType: ConfigType;

    switch (config.payloadVariant?.field) {
      case "device":
        configType = "DEVICE_CONFIG";
        break;

      case "display":
        configType = "DISPLAY_CONFIG";
        break;

      case "lora":
        configType = "LORA_CONFIG";
        break;

      case "position":
        configType = "POSITION_CONFIG";
        break;

      case "power":
        configType = "POWER_CONFIG";
        break;

      case "network":
        configType = "NETWORK_CONFIG";
        break;

      case "bluetooth":
        configType = "BLUETOOTH_CONFIG";
        break;
    }

    const setRadio = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "setConfig",
        value: config
      }
    });

    await this.sendPacket(
      setRadio,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getConfig(configType);
        await callback?.(id);
      }
    );
  }

  /**
   * Writes module config to device
   *
   * @param {ModuleConfig} config Module config object
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async setModuleConfig(
    config: messages.ModuleConfig,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.setModuleConfig,
      `Setting module config ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    let configType: ModuleConfigType;

    switch (config.payloadVariant?.field) {
      case "mqtt":
        configType = "MQTT_CONFIG";
        break;

      case "serial":
        configType = "SERIAL_CONFIG";
        break;

      case "externalNotification":
        configType = "EXTNOTIF_CONFIG";
        break;

      case "storeForward":
        configType = "STOREFORWARD_CONFIG";
        break;

      case "rangeTest":
        configType = "RANGETEST_CONFIG";
        break;

      case "telemetry":
        configType = "TELEMETRY_CONFIG";
        break;

      case "cannedMessage":
        configType = "CANNEDMSG_CONFIG";
        break;
    }

    const setRadio = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "setModuleConfig",
        value: config
      }
    });

    await this.sendPacket(
      setRadio,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getModuleConfig(configType);
        await callback?.(id);
      }
    );
  }

  /**
   * Confirms the currently set config, and prevents changes from reverting
   * after 10 minutes.
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async confirmSetConfig(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.confirmSetConfig,
      `Confirming config ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    const confirmSetRadio = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "confirmSetRadio",
        value: true
      }
    });

    await this.sendPacket(
      confirmSetRadio,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Sets devices owner data
   *
   * @param {User} owner Owner data to apply to the device
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async setOwner(
    owner: messages.User,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.setOwner,
      `Setting owner ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    const setOwner = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "setOwner",
        value: owner
      }
    });

    await this.sendPacket(
      setOwner,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getOwner();
        await callback?.(id);
      }
    );
  }

  /**
   * Sets devices ChannelSettings
   *
   * @param {Channel} channel Channel data to be set
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async setChannel(
    channel: messages.Channel,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.setChannel,
      `📻 Setting Channel: ${channel.index} ${
        callback ? "with" : "without"
      } callback`,
      "DEBUG"
    );

    const setChannel = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "setChannel",
        value: channel
      }
    });

    await this.sendPacket(
      setChannel,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getChannel(channel.index);
        await callback?.(id);
      }
    );
  }

  /**
   * Confirms the currently set channels, and prevents changes from reverting
   * after 10 minutes.
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async confirmSetChannel(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.confirmSetChannel,
      `📻 Confirming Channel config ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    const confirmSetChannel = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "confirmSetRadio",
        value: true
      }
    });

    await this.sendPacket(
      confirmSetChannel,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Clears specific channel with the designated index
   *
   * @param {number} index Channel index to be cleared
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async clearChannel(
    index: number,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.clearChannel,
      `📻 Clearing Channel ${index} ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    const channel = Channel.createValue({
      index,
      role: "DISABLED"
    });
    const setChannel = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "setChannel",
        value: channel
      }
    });

    await this.sendPacket(
      setChannel,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        await this.getChannel(channel.index);
        await callback?.(id);
      }
    );
  }

  /**
   * Gets specified channel information from the radio
   *
   * @param {number} index Channel index to be retrieved
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getChannel(
    index: number,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getChannel,
      `📻 Requesting Channel: ${index} ${
        callback ? "with" : "without"
      } callback`,
      "DEBUG"
    );

    const getChannelRequest = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "getChannelRequest",
        value: index + 1
      }
    });

    await this.sendPacket(
      getChannelRequest,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Gets devices config
   *
   * @param {AdminMessage_ConfigType} configType Desired config type to request
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getConfig(
    configType: ConfigType,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getConfig,
      `Requesting config ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    const getRadioRequest = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "getConfigRequest",
        value: configType
      }
    });

    await this.sendPacket(
      getRadioRequest,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Gets Module config
   *
   * @param {AdminMessage_ModuleConfigType} moduleConfigType Desired module
   *   config type to request
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getModuleConfig(
    moduleConfigType: ModuleConfigType,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getModuleConfig,
      `Requesting module config ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    const getRadioRequest = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "getModuleConfigRequest",
        value: moduleConfigType
      }
    });

    await this.sendPacket(
      getRadioRequest,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Gets devices Owner
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getOwner(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getOwner,
      `Requesting owner ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    const getOwnerRequest = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "getOwnerRequest",
        value: true
      }
    });

    await this.sendPacket(
      getOwnerRequest,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      callback
    );
  }

  /**
   * Gets devices metadata
   *
   * @param {number} nodeNum Destination Node to be queried
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async getMetadata(
    nodeNum: number,
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.getMetadata,
      `Requesting metadata from ${nodeNum} ${
        callback ? "with" : "without"
      } callback`,
      "DEBUG"
    );

    const getDeviceMetricsRequest = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "getDeviceMetadataRequest",
        value: true
      }
    });

    await this.sendPacket(
      getDeviceMetricsRequest,
      "ADMIN_APP",
      nodeNum,
      true,
      Types.ChannelNumber.ADMIN,
      true,
      false,
      callback
    );
  }

  /**
   * Resets the internal NodeDB of the radio, usefull for removing old nodes
   * that no longer exist.
   *
   * @param {(id: number) => Promise<void>} [callback] If wantAck is true,
   *   callback is called when the ack is received
   */
  public async resetPeers(
    callback?: (id: number) => Promise<void>
  ): Promise<void> {
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.resetPeers,
      `📻 Resetting Peers ${callback ? "with" : "without"} callback`,
      "DEBUG"
    );

    const resetPeers = AdminMessage.encodeBinary({
      payloadVariant: {
        field: "nodedbReset",
        value: 1
      }
    });

    await this.sendPacket(
      resetPeers,
      "ADMIN_APP",
      this.myNodeInfo.myNodeNum,
      true,
      0,
      true,
      false,
      async (id: number) => {
        callback && (await callback(id));
      }
    );
  }

  /** Triggers the device configure process */
  public configure(): void {
    // TODO: this not always logged
    this.log(
      Types.EmitterScope.iMeshDevice,
      Types.Emitter.configure,
      `⚙️ Requesting device configuration`,
      "DEBUG"
    );
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONFIGURING);

    const toRadio = ToRadio.encodeBinary({
      payloadVariant: {
        field: "wantConfigId",
        value: this.configId
      }
    });

    setTimeout(() => {
      void this.sendRaw(0, toRadio);
    }, 200);
  }

  /**
   * Updates the device status eliminating duplicate status events
   *
   * @param {Types.DeviceStatusEnum} status New device status
   */
  public updateDeviceStatus(status: Types.DeviceStatusEnum): void {
    if (status !== this.deviceStatus) {
      this.onDeviceStatus.emit(status);
    }
  }

  /**
   * Generates random packet identifier
   *
   * @returns {number} Random packet ID
   */
  private generateRandId(): number {
    return Math.floor(Math.random() * 1e9);
  }

  /**
   * Gets called whenever a fromRadio message is received from device, returns
   * fromRadio data
   *
   * @param {Uint8Array} fromRadio Uint8Array containing raw radio data
   */
  protected async handleFromRadio(fromRadio: Uint8Array): Promise<void> {
    const decodedMessage = FromRadio.decodeBinary(fromRadio);

    this.onFromRadio.emit(decodedMessage);

    /** @todo Add map here when `all=true` gets fixed. */
    switch (decodedMessage.payloadVariant?.field) {
      case "packet":
        await this.handleMeshPacket(decodedMessage.payloadVariant.value);
        break;

      case "myInfo":
        if (
          parseFloat(decodedMessage.payloadVariant.value.firmwareVersion) <
          minFwVer
        ) {
          this.log(
            Types.EmitterScope.iMeshDevice,
            Types.Emitter.handleFromRadio,
            `Device firmware outdated. Min supported: ${minFwVer} got : ${decodedMessage.payloadVariant.value.firmwareVersion}`,
            "CRITICAL"
          );
        }
        this.onMyNodeInfo.emit(decodedMessage.payloadVariant.value);
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          "📱 Received Node info for this device",
          "TRACE"
        );
        break;

      case "nodeInfo":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          `📱 Received Node Info packet for node: ${decodedMessage.payloadVariant.value.num}`,
          "TRACE"
        );

        this.onNodeInfoPacket.emit({
          packet: MeshPacket.createValue({
            id: decodedMessage.id
          }),
          data: decodedMessage.payloadVariant.value
        });

        if (decodedMessage.payloadVariant.value.position) {
          this.onPositionPacket.emit({
            packet: MeshPacket.createValue({
              id: decodedMessage.id,
              from: decodedMessage.payloadVariant.value.num
            }),
            data: decodedMessage.payloadVariant.value.position
          });
        }

        if (decodedMessage.payloadVariant.value.user) {
          this.onUserPacket.emit({
            packet: MeshPacket.createValue({
              id: decodedMessage.id,
              from: decodedMessage.payloadVariant.value.num
            }),
            data: decodedMessage.payloadVariant.value.user
          });
        }
        break;

      case "config":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          `${
            decodedMessage.payloadVariant.value.payloadVariant ? "💾" : "⚠️"
          } Received Config packet of variant: ${
            decodedMessage.payloadVariant.value.payloadVariant?.field ?? "UNK"
          }`,
          decodedMessage.payloadVariant.value.payloadVariant?.field
            ? "TRACE"
            : "WARNING"
        );

        this.onConfigPacket.emit({
          packet: MeshPacket.createValue({
            id: decodedMessage.id
          }),
          data: decodedMessage.payloadVariant.value
        });
        break;

      case "logRecord":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          "Received onLogRecord",
          "TRACE"
        );
        this.onLogRecord.emit(decodedMessage.payloadVariant.value);
        break;

      case "configCompleteId":
        if (decodedMessage.payloadVariant.value !== this.configId) {
          this.log(
            Types.EmitterScope.iMeshDevice,
            Types.Emitter.handleFromRadio,
            `❌ Invalid config id reveived from device, exptected ${this.configId} but received ${decodedMessage.payloadVariant.value}`,
            "ERROR"
          );
        }

        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          `⚙️ Valid config id reveived from device: ${this.configId}`,
          "INFO"
        );

        //TODO: remove protobufs
        // await this.sendRaw(
        //   0,
        //   ToRadio.encodeBinary({
        //     payloadVariant: {
        //       peerInfo: {
        //         appVersion: 1,
        //         mqttGateway: false
        //       },
        //       oneofKind: "peerInfo"
        //     }
        //   })
        // );

        this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONFIGURED);
        break;

      case "rebooted":
        this.configure();
        break;

      case "moduleConfig":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          `${
            decodedMessage.payloadVariant.value.payloadVariant?.field
              ? "💾"
              : "⚠️"
          } Received Module Config packet of variant: ${
            decodedMessage.payloadVariant.value.payloadVariant?.field ?? "UNK"
          }`,
          decodedMessage.payloadVariant.value.payloadVariant?.field
            ? "TRACE"
            : "WARNING"
        );

        this.onModuleConfigPacket.emit({
          packet: MeshPacket.createValue({
            id: decodedMessage.id
          }),
          data: decodedMessage.payloadVariant.value
        });
        break;

      case "channel":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleFromRadio,
          `🔐 Received Channel: ${decodedMessage.payloadVariant.value.index}`,
          "TRACE"
        );

        this.onChannelPacket.emit({
          packet: MeshPacket.createValue({
            id: decodedMessage.id
          }),
          data: decodedMessage.payloadVariant.value
        });
        break;
    }
  }

  /** Completes all SubEvents */
  public complete(): void {
    this.onLogEvent.cancelAll();
    this.onFromRadio.cancelAll();
    this.onMeshPacket.cancelAll();
    this.onMyNodeInfo.cancelAll();
    this.onNodeInfoPacket.cancelAll();
    this.onUserPacket.cancelAll();
    this.onChannelPacket.cancelAll();
    this.onConfigPacket.cancelAll();
    this.onModuleConfigPacket.cancelAll();
    this.onPingPacket.cancelAll();
    this.onIpTunnelPacket.cancelAll();
    this.onSerialPacket.cancelAll();
    this.onStoreForwardPacket.cancelAll();
    this.onRangeTestPacket.cancelAll();
    this.onTelemetryPacket.cancelAll();
    this.onPrivatePacket.cancelAll();
    this.onAtakPacket.cancelAll();
    this.onRoutingPacket.cancelAll();
    this.onPositionPacket.cancelAll();
    this.onMessagePacket.cancelAll();
    this.onRemoteHardwarePacket.cancelAll();
    this.onDeviceStatus.cancelAll();
    this.onLogRecord.cancelAll();
    this.onMeshHeartbeat.cancelAll();
    this.queue.clear();
  }

  /**
   * Gets called when a MeshPacket is received from device
   *
   * @param {MeshPacket} meshPacket Packet to process
   */
  private async handleMeshPacket(
    meshPacket: messages.MeshPacket
  ): Promise<void> {
    this.onMeshPacket.emit(meshPacket);
    if (meshPacket.from !== this.myNodeInfo.myNodeNum) {
      /**
       * TODO: this shouldn't be called unless the device interracts with the
       * mesh, currently it does.
       */
      this.onMeshHeartbeat.emit(new Date());
    }

    switch (meshPacket.payloadVariant?.field) {
      case "decoded":
        await this.queue.processAck(meshPacket.payloadVariant.value.requestId);
        this.handleDataPacket(meshPacket.payloadVariant.value, meshPacket);
        break;

      case "encrypted":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "Device received encrypted data packet, ignoring.",
          "DEBUG"
        );
        break;
    }
  }

  private handleDataPacket(
    dataPacket: messages.Data,
    meshPacket: messages.MeshPacket
  ) {
    let adminMessage: messages.AdminMessage | undefined = undefined;
    switch (dataPacket.portnum) {
      case "TEXT_MESSAGE_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received TEXT_MESSAGE_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onMessagePacket.emit({
          packet: meshPacket,
          text: new TextDecoder().decode(dataPacket.payload)
        });
        break;

      case "REMOTE_HARDWARE_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received REMOTE_HARDWARE_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onRemoteHardwarePacket.emit({
          packet: meshPacket,
          data: HardwareMessage.decodeBinary(dataPacket.payload)
        });
        break;

      case "POSITION_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received POSITION_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onPositionPacket.emit({
          packet: meshPacket,
          data: Position.decodeBinary(dataPacket.payload)
        });
        break;

      case "NODEINFO_APP":
        /**
         * TODO: workaround for NODEINFO_APP plugin sending a User protobuf
         * instead of a NodeInfo protobuf
         */
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received NODEINFO_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onUserPacket.emit({
          packet: meshPacket,
          data: User.decodeBinary(dataPacket.payload)
        });
        break;

      case "ROUTING_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received ROUTING_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onRoutingPacket.emit({
          packet: meshPacket,
          data: Routing.decodeBinary(dataPacket.payload)
        });
        break;

      case "ADMIN_APP":
        adminMessage = AdminMessage.decodeBinary(dataPacket.payload);
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          `📦 Received ADMIN_APP packet of variant ${
            //change
            adminMessage.payloadVariant?.field ?? "UNK"
          }`,
          "TRACE",
          dataPacket.payload
        );
        switch (adminMessage.payloadVariant?.field) {
          case "getChannelResponse":
            this.onChannelPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.value
            });
            break;
          case "getOwnerResponse":
            this.onUserPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.value
            });
            break;
          case "getConfigResponse":
            this.onConfigPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.value
            });
            break;
          case "getModuleConfigResponse":
            this.onModuleConfigPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.value
            });
            break;
          case "getDeviceMetadataResponse":
            this.onDeviceMetadataPacket.emit({
              packet: meshPacket,
              data: adminMessage.payloadVariant.value
            });
            break;
          default:
            this.log(
              Types.EmitterScope.iMeshDevice,
              Types.Emitter.handleMeshPacket,
              `Received unhandled AdminMessage, type ${
                adminMessage.payloadVariant?.field ?? "undefined"
              }`,
              "DEBUG",
              dataPacket.payload
            );
        }
        break;

      case "TEXT_MESSAGE_COMPRESSED_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received TEXT_MESSAGE_COMPRESSED_APP packet",
          "TRACE",
          dataPacket.payload
        );
        break;

      case "WAYPOINT_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received WAYPOINT_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onWaypointPacket.emit({
          packet: meshPacket,
          data: Waypoint.decodeBinary(dataPacket.payload)
        });
        break;

      case "REPLY_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received REPLY_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onPingPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case "IP_TUNNEL_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received IP_TUNNEL_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onIpTunnelPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case "SERIAL_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received SERIAL_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onSerialPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case "STORE_FORWARD_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received STORE_FORWARD_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onStoreForwardPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case "RANGE_TEST_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received RANGE_TEST_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onRangeTestPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case "TELEMETRY_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received TELEMETRY_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onTelemetryPacket.emit({
          packet: meshPacket,
          data: Telemetry.decodeBinary(dataPacket.payload)
        });
        break;

      case "PRIVATE_APP":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received PRIVATE_APP packet",
          "TRACE",
          dataPacket.payload
        );
        this.onPrivatePacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      case "ATAK_FORWARDER":
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          "📦 Received ATAK_FORWARDER packet",
          "TRACE",
          dataPacket.payload
        );
        this.onAtakPacket.emit({
          packet: meshPacket,
          data: dataPacket.payload
        });
        break;

      default:
        this.log(
          Types.EmitterScope.iMeshDevice,
          Types.Emitter.handleMeshPacket,
          `⚠️ Received unhandled PortNum: ${dataPacket.portnum}`, //warn
          "WARNING",
          dataPacket.payload
        );
        break;
    }
  }
}
