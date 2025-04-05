import { MessageBus, systemBus, Variant } from 'dbus-next'
import { EventEmitter } from 'events'

interface AdapterEvents {
  change: []
}

interface DiscoveryFilter {
  UUIDs: string[]
  RSSI: number
  Pathloss: number
  Transport: 'bredr' | 'le' | 'auto'
}

/**
 * Represents a Bluetooth adapter.
 */
export class Adapter extends EventEmitter<AdapterEvents> {
  private _address: string
  private _name: string
  private _alias: string
  private _class: number
  private _powered: boolean
  private _discoverable: boolean
  private _pairable: boolean
  private _pairableTimeout: number
  private _discoverableTimeout: number
  private _discovering: boolean
  private _uuids: string[]
  private _modalias: string | null

  /**
   * DBus object path of the adapter.
   */
  public get path(): string {
    return this._path
  }

  /**
   * MAC address.
   */
  public get address(): string {
    return this._address
  }

  /**
   * Adapter name.
   */
  public get name(): string {
    return this._name
  }

  /**
   * Adapter alias (name that can be customized).
   */
  public get alias(): string {
    return this._alias
  }

  public set alias(v: string) {
    this._alias = v
    this.setProperty('Alias', 's', v)
  }

  /**
   * Adapter's device class.
   */
  public get class(): number {
    return this._class
  }

  /**
   * Adapter's power status.
   */
  public get powered(): boolean {
    return this._powered
  }

  public set powered(v: boolean) {
    this._powered = v
    this.setProperty('Powered', 'b', v)
  }

  /**
   * Whether the adapter is discoverable.
   */
  public get discoverable(): boolean {
    return this._discoverable
  }

  public set discoverable(v: boolean) {
    this._discoverable = v
    this.setProperty('Discoverable', 'b', v)
  }

  /**
   * Whether the adapter is pairable.
   */
  public get pairable(): boolean {
    return this._pairable
  }

  public set pairable(v: boolean) {
    this._pairable = v
    this.setProperty('Pairable', 'b', v)
  }

  /**
   * Timeout for pairable mode. Disabled when set to 0.
   */
  public get pairableTimeout(): number {
    return this._pairableTimeout
  }

  public set pairableTimeout(v: number) {
    this._pairableTimeout = v
    this.setProperty('PairableTimeout', 'u', v)
  }

  /**
   * Timeout for discoverable mode. Disabled when set to 0.
   */
  public get discoverableTimeout(): number {
    return this._discoverableTimeout
  }

  public set discoverableTimeout(v: number) {
    this._discoverableTimeout = v
    this.setProperty('DiscoverableTimeout', 'u', v)
  }

  /**
   * Whether the adapter is currently discovering new devices.
   */
  public get discovering(): boolean {
    return this._discovering
  }

  /**
   * UUIDs of services provided by the adapter.
   */
  public get uuids(): string[] {
    return this._uuids
  }

  /**
   * Device ID in modalias format used by the kernel.
   */
  public get modalias(): string | null {
    return this._modalias
  }

  private constructor(
    private _path: string,
    data: {
      address: string
      name: string
      alias: string
      class: number
      powered: boolean
      discoverable: boolean
      pairable: boolean
      pairableTimeout: number
      discoverableTimeout: number
      discovering: boolean
      uuids: string[]
      modalias?: string
    },
    private _bus: MessageBus = systemBus()
  ) {
    super()

    this._address = data.address
    this._name = data.name
    this._alias = data.alias
    this._class = data.class
    this._powered = data.powered
    this._discoverable = data.discoverable
    this._pairable = data.pairable
    this._pairableTimeout = data.pairableTimeout
    this._discoverableTimeout = data.discoverableTimeout
    this._discovering = data.discovering
    this._uuids = data.uuids
    this._modalias = data.modalias ?? null

    this.listenForChanges()
  }

  /**
   * Constructs a new adapter object from raw data obtained from DBus.
   * @param data Data obtained from DBus
   * @param bus DBus' message bus to be used, defaults to the system bus
   * @returns New adapter object
   */
  public static fromDBusObject = (
    data: [string, { [key: string]: { value: unknown } }],
    bus: MessageBus = systemBus()
  ): Adapter =>
    new Adapter(
      data[0],
      {
        address: data[1].Address.value as string,
        name: data[1].Name.value as string,
        alias: data[1].Alias.value as string,
        class: data[1].Class.value as number,
        powered: data[1].Powered.value as boolean,
        discoverable: data[1].Discoverable.value as boolean,
        pairable: data[1].Pairable.value as boolean,
        pairableTimeout: data[1].PairableTimeout.value as number,
        discoverableTimeout: data[1].DiscoverableTimeout.value as number,
        discovering: data[1].Discovering.value as boolean,
        uuids: data[1].UUIDs.value as string[],
        modalias: data[1].Modalias?.value as string | undefined,
      },
      bus
    )

  /**
   * Starts device discovery.
   */
  public async startDiscovery() {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const adapter = proxy.getInterface('org.bluez.Adapter1')

    await adapter.StartDiscovery()
  }

  /**
   * Stops device discovery.
   */
  public async stopDiscovery() {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const adapter = proxy.getInterface('org.bluez.Adapter1')

    await adapter.StopDiscovery()
  }

  /**
   * Removes a given device from the adapter.
   * @param device Device to be removed
   */
  // TODO: add option to pass in device object
  public async removeDevice(device: string) {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const adapter = proxy.getInterface('org.bluez.Adapter1')

    await adapter.RemoveDevice(device)
  }

  /**
   * Sets a device discovery filter.
   * @param filter Filter to be used
   */
  public async setDiscoveryFilter(filter: DiscoveryFilter) {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const adapter = proxy.getInterface('org.bluez.Adapter1')

    await adapter.SetDiscoveryFilter(filter)
  }

  private async setProperty<T>(prop: string, signature: string, val: T) {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const propManager = proxy.getInterface('org.freedesktop.DBus.Properties')

    await propManager.Set(
      'org.bluez.Adapter1',
      prop,
      new Variant(signature, val)
    )
  }

  private async listenForChanges() {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const propManager = proxy.getInterface('org.freedesktop.DBus.Properties')

    propManager.on(
      'PropertiesChanged',
      (iface, changed: { [key: string]: { value: unknown } }) => {
        if (iface !== 'org.bluez.Adapter1') return

        for (const [prop, { value }] of Object.entries(changed)) {
          switch (prop) {
            case 'Address':
              this._address = value as string
              break

            case 'Name':
              this._name = value as string
              break

            case 'Alias':
              this._alias = value as string
              break

            case 'Class':
              this._class = value as number
              break

            case 'Powered':
              this._powered = value as boolean
              break

            case 'Discoverable':
              this._discoverable = value as boolean
              break

            case 'Pairable':
              this._pairable = value as boolean
              break

            case 'PairableTimeout':
              this._pairableTimeout = value as number
              break

            case 'DiscoverableTimeout':
              this._discoverableTimeout = value as number
              break

            case 'Discovering':
              this._discovering = value as boolean
              break

            case 'UUIDs':
              this._uuids = value as string[]
              break

            case 'Modalias':
              this._modalias = value as string | null
              break

            default:
              console.warn(`bluen: Adapter: Unhandled property change: ${prop}`)
              continue
          }

          this.emit('change')
        }
      }
    )
  }
}
