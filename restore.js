const {spawn} = require('child_process');
const arr = [
          '/etc/udhcpd.conf',
          '/etc/default/udhcpd',
          '/etc/network/interfaces',
          '/etc/hostapd/hostapd.conf',
          '/etc/default/hostapd',
          '/etc/sysctl.conf',
          '/etc/iptables.ipv4.nat'
        ];
        
for (let key of arr) {
  spawn('sudo', ['rm', '-rf', key]);
  spawn('sudo', ['cp', key + '.backup', key]);
}

spawn('sudo', ['reboot']);