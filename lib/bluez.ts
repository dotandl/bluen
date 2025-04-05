import { MessageBus, systemBus } from 'dbus-next'
import { Adapter } from './adapter'

/**
 * Main interface to interact with BlueZ.
 */
export class Bluez {
  /**
   * Constructs a new Bluez object.
   * @param bus DBus' message bus to be used. Defaults to the system bus
   */
  public constructor(private bus: MessageBus = systemBus()) {}

  /**
   * Retrieves all available adapters.
   * @returns List of available adapters.
   */
  public async getAdapters(): Promise<Adapter[]> {
    const proxy = await this.bus.getProxyObject('org.bluez', '/')
    const objManager = proxy.getInterface('org.freedesktop.DBus.ObjectManager')

    const objects = await objManager.GetManagedObjects()

    return (
      Object.entries(objects)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, v]) => Object.keys(v).includes('org.bluez.Adapter1'))
        .map(
          ([path, ifaces]) =>
            [path, ifaces['org.bluez.Adapter1']] as [
              string,
              { [key: string]: { value: unknown } },
            ]
        )
        .map((entry) => Adapter.fromDBusObject(entry, this.bus))
    )
  }
}
