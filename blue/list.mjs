import {Bluez} from '@tanislav000/bluez';
const bluetooth = new Bluez();

const showDevice = (dev) => {
    let line = dev.Address+' '+dev.Name;
    if (dev.Paired) line += ' (paired)';
    if (dev.Connected) line += ' (connected)';
    console.log(line);
}

bluetooth.init().then(async () => {
    // listen on first bluetooth adapter
    const adapter = await bluetooth.getAdapter();
    console.log('AD',await adapter.Discovering());
    if (await adapter.Discovering()) await adapter.StopDiscovery();

    const devs = await adapter.listDevices();
    for (let [key, value] of Object.entries(devs)) {
        if (value.Name) {
            //value.Address += '$';
            showDevice(value);
        }
    }

    adapter.on('DeviceAdded', (address, props) => {
        if (props.Name) showDevice(props);
    });

    await adapter.StartDiscovery();
    console.log("Discovering");
}).catch(console.error);

