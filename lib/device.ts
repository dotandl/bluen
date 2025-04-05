import { MessageBus, systemBus, Variant } from 'dbus-next'
import { EventEmitter } from 'events'
import { Adapter } from './adapter'

interface DeviceEvents {
  change: []
}

/**
 * Represents a Bluetooth device.
 */
export class Device extends EventEmitter<DeviceEvents> {
  private _name: string | null
  private _icon: string | null
  private _class: number | null
  private _appearance: number | null
  private _uuids: string[] | null
  private _paired: boolean
  private _connected: boolean
  private _trusted: boolean
  private _blocked: boolean
  private _alias: string
  private _adapter: Adapter
  private _legacyPairing: boolean
  private _modalias: string | null
  private _rssi: number | null
  private _txPower: number | null
  private _manufacturerData: object | null
  private _serviceData: object | null
  private _gattServices: string[] | null

  /**
   * DBus object path of the device.
   */
  public get path(): string {
    return this._path
  }

  /**
   * Device name.
   */
  public get name(): string | null {
    return this._name
  }

  /**
   * Device's icon name.
   */
  public get icon(): string | null {
    return this._icon
  }

  /**
   * Device class.
   */
  public get class(): number | null {
    return this._class
  }

  /**
   * External appearance of the device.
   */
  public get appearance(): number | null {
    return this._appearance
  }

  /**
   * List of available services' UUIDs.
   */
  public get uuids(): string[] | null {
    return this._uuids
  }

  /**
   * Whether the device is paired.
   */
  public get paired(): boolean {
    return this._paired
  }

  /**
   * Whether the device is connected.
   */
  public get connected(): boolean {
    return this._connected
  }

  /**
   * Whether the device is trusted.
   */
  public get trusted(): boolean {
    return this._trusted
  }

  public set trusted(v: boolean) {
    this._trusted = v
    this.setProperty('Trusted', 'b', v)
  }

  /**
   * Whether the device is blocked.
   */
  public get blocked(): boolean {
    return this._blocked
  }

  public set blocked(v: boolean) {
    this._blocked = v
    this.setProperty('Blocked', 'b', v)
  }

  /**
   * Devices' alias (custom name.)
   */
  public get alias(): string {
    return this._alias
  }

  public set alias(v: string) {
    this._alias = v
    this.setProperty('Alias', 's', v)
  }

  /**
   * Adapter that manages the device.
   */
  public get adapter(): Adapter {
    return this._adapter
  }

  /**
   * Whether pre-BT2.1 pairing mechanism is used.
   */
  public get legacyPairing(): boolean {
    return this._legacyPairing
  }

  /**
   * Device ID in modalias format used by the kernel.
   */
  public get modalias(): string | null {
    return this._modalias
  }

  /**
   * Received signal strength indicator.
   */
  public get rssi(): number | null {
    return this._rssi
  }

  /**
   * Advertised transmitted power level.
   */
  public get txPower(): number | null {
    return this._txPower
  }

  /**
   * Manufacturer-specifica data.
   */
  public get manufacturerData(): object | null {
    return this._manufacturerData
  }

  /**
   * Service advertisement data.
   */
  public get serviceData(): object | null {
    return this._serviceData
  }

  /**
   * List of available GATT services.
   */
  public get gattServices(): string[] | null {
    return this._gattServices
  }

  private constructor(
    private _path: string,
    data: {
      name: string | null
      icon: string | null
      class: number | null
      appearance: number | null
      uuids: string[] | null
      paired: boolean
      connected: boolean
      trusted: boolean
      blocked: boolean
      alias: string
      adapter: string
      legacyPairing: boolean
      modalias: string | null
      rssi: number | null
      txPower: number | null
      manufacturerData: object | null
      serviceData: object | null
      gattServices: string[] | null
    },
    private _bus: MessageBus = systemBus()
  ) {
    super()

    this._name = data.name ?? null
    this._icon = data.icon ?? null
    this._class = data.class ?? null
    this._appearance = data.appearance ?? null
    this._uuids = data.uuids ?? null
    this._paired = data.paired
    this._connected = data.connected
    this._trusted = data.trusted
    this._blocked = data.blocked
    this._alias = data.alias
    Adapter.fromPath(data.adapter).then((adapter) => (this._adapter = adapter))
    this._legacyPairing = data.legacyPairing
    this._modalias = data.modalias ?? null
    this._rssi = data.rssi ?? null
    this._txPower = data.txPower ?? null
    this._manufacturerData = data.manufacturerData ?? null
    this._serviceData = data.serviceData ?? null
    this._gattServices = data.gattServices ?? null

    this.listenForChanges()
  }

  /**
   * Constructs a new device object from raw data obtained from DBus.
   * @param data Raw data obtained from DBus
   * @param bus DBus' message bus to be used, defaults to the system bus
   * @returns New device object
   */
  public static fromDBusObject = (
    data: [string, { [key: string]: { value: unknown } }],
    bus: MessageBus = systemBus()
  ): Device =>
    new Device(
      data[0],
      {
        name: data[1].Name?.value as string | undefined,
        icon: data[1].Icon?.value as string | undefined,
        class: data[1].Class?.value as number | undefined,
        appearance: data[1].Appearance?.value as number | undefined,
        uuids: data[1].UUIDs?.value as string[] | undefined,
        paired: data[1].Paired.value as boolean,
        connected: data[1].Connected.value as boolean,
        trusted: data[1].Trusted.value as boolean,
        blocked: data[1].Blocked.value as boolean,
        alias: data[1].Alias.value as string,
        adapter: data[1].Adapter.value as string,
        legacyPairing: data[1].LegacyPairing.value as boolean,
        modalias: data[1].Modalias?.value as string | undefined,
        rssi: data[1].RSSI?.value as number | undefined,
        txPower: data[1].TxPower?.value as number | undefined,
        manufacturerData: data[1].ManufacturerData?.value as object | undefined,
        serviceData: data[1].ServiceData?.value as object | undefined,
        gattServices: data[1].GattServices?.value as string[] | undefined,
      },
      bus
    )

  /**
   * Retrieves all devices managed by the adapter.
   * @param adapter Adapter to be used
   * @param bus DBus' message bus to be used, defaults to the system bus
   * @returns List of devices managed by the adapter
   */
  public static async allOfAdapter(
    adapter: Adapter,
    bus: MessageBus = systemBus()
  ): Promise<Device[]> {
    const proxy = await bus.getProxyObject('org.bluez', '/')
    const objManager = proxy.getInterface('org.freedesktop.DBus.ObjectManager')

    const objects: [string, { [key: string]: { value: unknown } }][] =
      Object.entries(await objManager.GetManagedObjects())
        .filter(([path]) => path.startsWith(adapter.path))
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, ifaces]) =>
          Object.keys(ifaces).includes('org.bluez.Device1')
        )
        .map(([path, ifaces]) => [path, ifaces['org.bluez.Device1']])

    return objects.map((o) => Device.fromDBusObject(o, bus))
  }

  /**
   * Connects to the device.
   */
  public async connect() {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const iface = proxy.getInterface('org.bluez.Device1')

    await iface.Connect()
  }

  /**
   * Disconnects from the device.
   */
  public async disconnect() {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const iface = proxy.getInterface('org.bluez.Device1')

    await iface.Disconnect()
  }

  /**
   * Connects to a specific profile of the device.
   * @param uuid UUID of the profile
   */
  public async connectProfile(uuid: string) {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const iface = proxy.getInterface('org.bluez.Device1')

    await iface.ConnectProfile(uuid)
  }

  /**
   * Disconnects from a specific profile of the device.
   * @param uuid UUID of the profile
   */
  public async disconnectProfile(uuid: string) {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const iface = proxy.getInterface('org.bluez.Device1')

    await iface.DisconnectProfile(uuid)
  }

  /**
   * Initiates pairing with the device.
   */
  public async pair() {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const iface = proxy.getInterface('org.bluez.Device1')

    await iface.Pair()
  }

  /**
   * Cancels the pairing with the device.
   */
  public async cancelPairing() {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const iface = proxy.getInterface('org.bluez.Device1')

    await iface.CancelPairing()
  }

  private async setProperty<T>(prop: string, signature: string, val: T) {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const propManager = proxy.getInterface('org.freedesktop.DBus.Properties')

    await propManager.Set(
      'org.bluez.Device1',
      prop,
      new Variant(signature, val)
    )
  }

  private async listenForChanges() {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const propManager = proxy.getInterface('org.freedesktop.DBus.Properties')

    propManager.on(
      'PropertiesChanged',
      async (iface, props: { [key: string]: { value: unknown } }) => {
        if (iface !== 'org.bluez.Device1') return

        for (const [prop, { value }] of Object.entries(props)) {
          switch (prop) {
            case 'Name':
              this._name = value as string
              break

            case 'Icon':
              this._icon = value as string
              break

            case 'Class':
              this._class = value as number
              break

            case 'Appearance':
              this._appearance = value as number
              break

            case 'UUIDs':
              this._uuids = value as string[]
              break

            case 'Paired':
              this._paired = value as boolean
              break

            case 'Connected':
              this._connected = value as boolean
              break

            case 'Trusted':
              this._trusted = value as boolean
              break

            case 'Blocked':
              this._blocked = value as boolean
              break

            case 'Alias':
              this._alias = value as string
              break

            case 'Adapter':
              this._adapter = await Adapter.fromPath(value as string)
              break

            case 'LegacyPairing':
              this._legacyPairing = value as boolean
              break

            case 'Modalias':
              this._modalias = value as string
              break

            case 'RSSI':
              this._rssi = value as number
              break

            case 'TxPower':
              this._txPower = value as number
              break

            case 'ManufacturerData':
              this._manufacturerData = value as object
              break

            case 'ServiceData':
              this._serviceData = value as object
              break

            case 'GattServices':
              this._gattServices = value as string[]
              break

            default:
              console.warn(`bluen: Device: Unhandled property change: ${prop}`)
              continue
          }

          this.emit('change')
        }
      }
    )
  }
}
