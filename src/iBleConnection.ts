import { Types } from "./index.js";
import {
  fromNumUUID,
  fromRadioUUID,
  serviceUUID,
  toRadioUUID
} from "./constants.js";
import { IMeshDevice } from "./iMeshDevice.js";
import { typedArrayToBuffer } from "./utils/general.js";

/** Allows to connect to a Meshtastic device via bluetooth */
export class IBLEConnection extends IMeshDevice {
  /** Defines the connection type as ble */
  connType: string;

  /** Currently connected BLE device */
  device: BluetoothDevice | undefined;

  GATTServer: BluetoothRemoteGATTServer | undefined;

  /** Short Description */
  service: BluetoothRemoteGATTService | undefined;

  /** Short Description */
  toRadioCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

  /** Short Description */
  fromRadioCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

  /** Short Description */
  fromNumCharacteristic: BluetoothRemoteGATTCharacteristic | undefined;

  /** States if the device was force disconnected by a user */
  userInitiatedDisconnect: boolean;

  constructor(configId?: number) {
    super(configId);

    this.connType = "ble";
    this.device = undefined;
    this.service = undefined;
    this.GATTServer = undefined;
    this.toRadioCharacteristic = undefined;
    this.fromRadioCharacteristic = undefined;
    this.fromNumCharacteristic = undefined;
    this.userInitiatedDisconnect = false;
    // this.pendingRead = false;
  }

  /**
   * Gets web bluetooth support avaliability for the device
   *
   * @returns {Promise<void>}
   */
  public supported(): Promise<boolean> {
    return navigator.bluetooth.getAvailability();
  }

  /**
   * Gets list of bluetooth devices that can be passed to `connect`
   *
   * @returns {Promise<BluetoothDevice[]>} Array of avaliable BLE devices
   */
  public getDevices(): Promise<BluetoothDevice[]> {
    return navigator.bluetooth.getDevices();
  }

  /**
   * Opens browser dialog to select a device
   *
   * @param {RequestDeviceOptions} [filter] Filter to apply to
   *   `navigator.bluetooth.requestDevice()`
   * @returns {Promise<BluetoothDevice>} Returned BLE device
   */
  public getDevice(filter?: RequestDeviceOptions): Promise<BluetoothDevice> {
    return navigator.bluetooth.requestDevice(
      filter ?? {
        filters: [{ services: [serviceUUID] }]
      }
    );
  }

  /**
   * Initiates the connect process to a Meshtastic device via Bluetooth
   *
   * @param {Types.BLEConnectionParameters} parameters Ble connection parameters
   * @param {BluetoothDevice} parameters.device Externally obtained bluetooth
   *   device to use
   * @param {RequestDeviceOptions} parameters.deviceFilter Device request filter
   */
  public async connect({
    device,
    deviceFilter
  }: Types.BLEConnectionParameters): Promise<void> {
    /** Check for API avaliability */
    if (!navigator.bluetooth) {
      this.log(
        Types.EmitterScope.iBleConnection,
        Types.Emitter.connect,
        `⚠️ This browser doesn't support the WebBluetooth API`,
        "WARNING"
      );
    }

    /** Set device state to connecting */
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTING);

    /** Set device if specified, else request. */
    this.device = device ?? (await this.getDevice(deviceFilter));

    /** Setup event listners */
    this.device.addEventListener("gattserverdisconnected", () => {
      this.log(
        Types.EmitterScope.iBleConnection,
        Types.Emitter.connect,
        "Device disconnected",
        "INFO"
      );
      this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
      this.complete();
    });

    /** Connect to device */
    await this.device.gatt
      ?.connect()
      .then((server) => {
        this.log(
          Types.EmitterScope.iBleConnection,
          Types.Emitter.connect,
          `✅ Got GATT Server for device: ${server.device.id}`,
          "INFO"
        );
        this.GATTServer = server;
      })
      .catch((e: Error) => {
        this.log(
          Types.EmitterScope.iBleConnection,
          Types.Emitter.connect,
          `❌ Failed to connect: ${e.message}`,
          "ERROR"
        );
      });

    await this.GATTServer?.getPrimaryService(serviceUUID)
      .then((service) => {
        this.log(
          Types.EmitterScope.iBleConnection,
          Types.Emitter.connect,
          `✅ Got GATT Service for device: ${service.device.id}`,
          "INFO"
        );
        this.service = service;
      })
      .catch((e: Error) => {
        this.log(
          Types.EmitterScope.iBleConnection,
          Types.Emitter.connect,
          `❌ Failed to get primary service: q${e.message}`,
          "ERROR"
        );
      });

    [toRadioUUID, fromRadioUUID, fromNumUUID].map(async (uuid) => {
      await this.service
        ?.getCharacteristic(uuid)
        .then((characteristic) => {
          this.log(
            Types.EmitterScope.iBleConnection,
            Types.Emitter.connect,
            `✅ Got Characteristic ${characteristic.uuid} for device: ${characteristic.uuid}`,
            "INFO"
          );
          switch (uuid) {
            case toRadioUUID:
              this.toRadioCharacteristic = characteristic;
              break;
            case fromRadioUUID:
              this.fromRadioCharacteristic = characteristic;
              break;
            case fromNumUUID:
              this.fromNumCharacteristic = characteristic;
              break;
          }
        })
        .catch((e: Error) => {
          this.log(
            Types.EmitterScope.iBleConnection,
            Types.Emitter.connect,
            `❌ Failed to get toRadio characteristic: q${e.message}`,
            "ERROR"
          );
        });
    });

    await this.fromNumCharacteristic?.startNotifications(); // TODO: catch

    this.fromNumCharacteristic?.addEventListener(
      "characteristicvaluechanged",
      () => {
        void this.readFromRadio();
      }
    );

    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);

    this.configure();
  }

  /** Disconnects from the Meshtastic device */
  public disconnect(): void {
    this.userInitiatedDisconnect = true;
    this.device?.gatt?.disconnect();
    this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_DISCONNECTED);
    this.complete();
  }

  /**
   * Pings device to check if it is avaliable
   *
   * @todo Implement
   */
  public async ping(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /** Short description */
  protected async readFromRadio(): Promise<void> {
    // if (this.pendingRead) {
    //   return Promise.resolve();
    // }
    // this.pendingRead = true;
    let readBuffer = new ArrayBuffer(1);

    while (readBuffer.byteLength > 0 && this.fromRadioCharacteristic) {
      await this.fromRadioCharacteristic
        .readValue()
        .then((value) => {
          readBuffer = value.buffer;

          if (value.byteLength > 0) {
            void this.handleFromRadio(new Uint8Array(readBuffer, 0));
          }
          this.updateDeviceStatus(Types.DeviceStatusEnum.DEVICE_CONNECTED);
        })
        .catch((e: Error) => {
          readBuffer = new ArrayBuffer(0);
          this.log(
            Types.EmitterScope.iBleConnection,
            Types.Emitter.readFromRadio,
            `❌ ${e.message}`,
            "ERROR"
          );
        });
    }
    // this.pendingRead = false;
  }

  /**
   * Sends supplied protobuf message to the radio
   *
   * @param {Uint8Array} data Raw bytes to send to the radio
   */
  protected async writeToRadio(data: Uint8Array): Promise<void> {
    await this.toRadioCharacteristic?.writeValue(typedArrayToBuffer(data));
    // This should be automatic (onCharacteristicValueChanged)
    // await this.readFromRadio();
  }
}
