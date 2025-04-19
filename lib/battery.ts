import { MessageBus, systemBus } from 'dbus-next'
import { EventEmitter } from 'events'
import { Device } from './device'

interface BatteryEvents {
  change: []
}

export class Battery extends EventEmitter<BatteryEvents> {
  private _percentage: number
  private _source: string | null

  /**
   * Percentage state of the battery charge.
   */
  public get percentage(): number {
    return this._percentage
  }

  /**
   * Where the information about the battery charge state comes from.
   */
  public get source(): string | null {
    return this._source
  }

  private constructor(
    private _path: string,
    data: { percentage: number; source?: string },
    private _bus: MessageBus = systemBus()
  ) {
    super()

    this._percentage = data.percentage
    this._source = data.source ?? null

    this.listenForChanges()
  }

  /**
   * Retrieves the battery interface associated with the given device.
   * @param device The device to retrieve the battery interface for
   * @returns New battery object
   */
  public static async ofDevice(device: Device): Promise<Battery> {
    const objManagerProxy = await device.bus.getProxyObject('org.bluez', '/')
    const objManager = objManagerProxy.getInterface(
      'org.freedesktop.DBus.ObjectManager'
    )

    const objects = await objManager.GetManagedObjects()
    const object = objects[device.path]

    if (!Object.keys(object).includes('org.bluez.Battery1')) {
      throw new Error(
        'bluen: Battery: Device does not support battery charge status interface'
      )
    }

    const proxy = await device.bus.getProxyObject('org.bluez', device.path)
    const propManager = proxy.getInterface('org.freedesktop.DBus.Properties')

    const getProperty = (prop: string) =>
      propManager
        .Get('org.bluez.Battery1', prop)
        .then((res: { value: unknown }) => res.value)

    return new Battery(
      device.path,
      {
        percentage: await getProperty('Percentage'),
        source: await getProperty('Source'),
      },
      device.bus
    )
  }

  private async listenForChanges() {
    const proxy = await this._bus.getProxyObject('org.bluez', this._path)
    const propManager = proxy.getInterface('org.freedesktop.DBus.Properties')

    propManager.on(
      'PropertiesChanged',
      (iface, props: { [key: string]: { value: unknown } }) => {
        if (iface !== 'org.bluez.Battery1') return

        for (const [prop, { value }] of Object.entries(props)) {
          switch (prop) {
            case 'Percentage':
              this._percentage = value as number
              break
            case 'Source':
              this._source = value as string
              break

            default:
              console.warn(`bluen: Battery: Unhandled property change: ${prop}`)
              continue
          }
        }

        this.emit('change')
      }
    )
  }
}
