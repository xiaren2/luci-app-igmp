'use strict';

'require form';
'require tools.widgets as widgets';
'require uci';
'require fs';
'require poll';

return L.view.extend({

    load: function() {
        return Promise.all([
            fs.stat('/etc/config/igmpproxy')
                .then(() => uci.load('igmpproxy'))
                .catch(() => this.createDefaultConfig())
                .then(() => this.ensureIgmpProxySection()),
            uci.load('firewall'),
            uci.load('network')
        ]);
    },

    createDefaultConfig: function() {
        var defaultConfig = [
            "config igmpproxy",
            "\toption quickleave '1'",
            "\toption verbose '1'",
            ""
        ].join('\n');

        return fs.write('/etc/config/igmpproxy', defaultConfig)
            .then(() => uci.load('igmpproxy'));
    },

    ensureIgmpProxySection: function() {
        var sections = uci.sections('igmpproxy', 'igmpproxy');

        if (sections.length === 0) {
            var sid = uci.add('igmpproxy', 'igmpproxy');
            uci.set('igmpproxy', sid, 'quickleave', '1');
            uci.set('igmpproxy', sid, 'verbose', '1');
            return uci.save('igmpproxy');
        }

        return Promise.resolve();
    },

    handleService: function(action) {
        return fs.exec('/etc/init.d/igmpproxy', [action]);
    },

  findAltNetworks: function() {
        return fs.exec('/sbin/logread', ['-e', 'igmpproxy']).then(res => {
            if (res.code !== 0) {
                return { ips: [], hasError: true };
            }

            if (!res.stdout || res.stdout.trim() === '') {
                return { ips: [], hasError: false, noLogs: true };
            }

            let lines = res.stdout.trim().split('\n');
            let ips = new Set();
            let foundLogs = false;

            lines.forEach(line => {
                if (line.includes('igmpproxy')) {
                    foundLogs = true;
                    let match = line.match(/The source address ([0-9.]+).*not in any valid net/);
                    if (match && match[1]) {
                        ips.add(match[1]);
                    }
                }
            });

            if (!foundLogs) {
                return { ips: [], hasError: false, noLogs: true };
            }

            return { ips: Array.from(ips), hasError: false, noLogs: false };
        }).catch(err => {
            console.error('Error in findAltNetworks:', err);
            return { ips: [], hasError: true, errorMsg: err.message };
        });
    },

    updateStatus: function(statusText, btnStart, btnStop, btnRestart) {
        return fs.exec('/bin/pidof', ['igmpproxy']).then(res => {
            if (res.code === 0 && res.stdout.trim()) {
                let pids = res.stdout.trim().split(/\s+/);
                let pidText = pids.join(', ');

                statusText.innerHTML = '<b style="color:green">' + _('Running') + '</b> (PID: ' + pidText + ')';
                btnStart.disabled = true;
                btnStop.disabled = false;
                btnRestart.disabled = false;
            } else {
                statusText.innerHTML = '<b style="color:red">' + _('Stopped') + '</b>';
                btnStart.disabled = false;
                btnStop.disabled = true;
                btnRestart.disabled = true;
            }
        }).catch(() => {
            statusText.innerHTML = '<b style="color:red">' + _('Error') + '</b>';
        });
    },

    ipToCidr24: function(ip) {
        let ipParts = ip.split('.');
        if (ipParts.length !== 4) return null;

        let subnet = ipParts[0] + '.' + ipParts[1] + '.' + ipParts[2] + '.0';
        return subnet + '/24';
    },

    render: function() {

        var m = new form.Map('igmpproxy', _('IGMP Proxy'),
            _('IGMP Proxy allows multicast traffic to be properly forwarded between networks，ipv4 only.by:github.com/xiaren2'));

        // ===== 状态栏 =====
        var statusText = E('span', {}, _('Checking status...'));

        var btnStart = E('button', {
            'class': 'btn cbi-button cbi-button-apply',
            'click': () => this.handleService('start').then(() =>
                this.updateStatus(statusText, btnStart, btnStop, btnRestart))
        }, _('Start'));

        var btnStop = E('button', {
            'class': 'btn cbi-button cbi-button-reset',
            'click': () => this.handleService('stop').then(() =>
                this.updateStatus(statusText, btnStart, btnStop, btnRestart))
        }, _('Stop'));

        var btnRestart = E('button', {
            'class': 'btn cbi-button',
            'click': () => this.handleService('restart').then(() =>
                this.updateStatus(statusText, btnStart, btnStop, btnRestart))
        }, _('Restart'));

        var btnRefresh = E('button', {
            'class': 'btn cbi-button',
            'click': () => window.location.reload(true)
        }, _('Refresh'));

        var statusBar = E('div', { 'class': 'cbi-section' }, [
            E('p', {}, [_('Status: '), statusText]),
            E('div', { 'style': 'margin-top:10px' }, [
                btnStart, ' ', btnStop, ' ', btnRestart, ' ', btnRefresh
            ])
        ]);

           // ===== 日志检测 =====
        var altResult = E('div', {
            'style': 'margin-top:10px;color:var(--text-color-high,#eee)'
        }, _('No data'));

        var btnFindAlt = E('button', {
            'class': 'btn cbi-button',
            'click': () => {
                altResult.innerHTML = '<span style="color:orange">' + _('Scanning logs...') + '</span>';
                this.findAltNetworks().then(result => {
                    if (result.hasError) {
                        altResult.innerHTML = '<span style="color:red">' + _('Error scanning logs') + '</span>';
                        return;
                    }
                    
                    if (result.noLogs) {
                        altResult.innerHTML = '<span style="color:#888">' + 
                            _('No igmpproxy logs found.') + '<br>' +
                            _('Please ensure IGMP Proxy is running and try playing multicast streams.') + 
                            '</span>';
                        return;
                    }
                    
                    if (!result.ips || result.ips.length === 0) {
                        altResult.innerHTML = _('No alternative network addresses found.');
                        return;
                    }

                    altResult.innerHTML = result.ips.map(ip =>
                        `<div style="margin:4px 0">
                            <span style="font-weight:bold">${ip}</span>
                            <button class="btn cbi-button" style="margin-left:8px" data-ip="${ip}">
                                ${_('Add')}
                            </button>
                        </div>`
                    ).join('');

                    altResult.querySelectorAll('button').forEach(btn => {
                        btn.addEventListener('click', () => {
                            let ip = btn.getAttribute('data-ip');
                            let cidr = this.ipToCidr24(ip);

                            if (!cidr) {
                                btn.innerText = _('Invalid IP');
                                return;
                            }

                            let sections = uci.sections('igmpproxy', 'phyint');
                            let upstream = sections.find(s => s.direction === 'upstream');

                            if (upstream) {
                                let sid = upstream['.name'];
                                let list = uci.get('igmpproxy', sid, 'altnet') || [];

                                if (!Array.isArray(list))
                                    list = [list];

                                if (!list.includes(cidr)) {
                                    list.push(cidr);
                                    uci.set('igmpproxy', sid, 'altnet', list);

                                    uci.save().then(() => {
                                        if (uci.apply)
                                            return uci.apply();
                                    });

                                    btn.innerText = _('Added');
                                } else {
                                    btn.innerText = _('Exists');
                                }
                            } else {
                                btn.innerText = _('No upstream');
                            }
                        });
                    });
                }).catch(err => {
                    console.error('Failed to scan logs:', err);
                    altResult.innerHTML = '<span style="color:red">' + _('Scan failed') + '</span>';
                });
            }
        }, _('Find Alternative Networks'));

        var altSection = E('div', { 'class': 'cbi-section' }, [
            E('p', {}, _('Detect alternative networks from logs:')),
            btnFindAlt,
            altResult
        ]);

        // 自动刷新
        if (!this.statusPoll) {
            this.statusPoll = poll.add(() =>
                this.updateStatus(statusText, btnStart, btnStop, btnRestart)
            );
        }

        // ===== General Settings =====
        var igmpSections = uci.sections('igmpproxy', 'igmpproxy');
        var sid = igmpSections.length ? igmpSections[0]['.name'] : 'config';

        var s = m.section(form.NamedSection, sid, 'igmpproxy', _('General Settings'));
        s.anonymous = false;
        s.addremove = false;

        var o = s.option(form.Flag, 'quickleave', _('Quick Leave'));
        o.enabled = '1';
        o.disabled = '0';
        o.rmempty = false;
        o.description = _('Send leave messages immediately on departure of the last member.');

        o = s.option(form.ListValue, 'verbose', _('Verbose Level'));
        o.value('0', '0');
        o.value('1', '1');
        o.value('2', '2');
        o.value('3', '3');
        o.default = '1';
        o.description = _('0=none, 1=minimal, 2=more, 3=max');

        // ===== Physical Interfaces =====
        s = m.section(form.GridSection, 'phyint', _('Physical Interfaces'));
        s.anonymous = false;
        s.addremove = true;
        s.description = _('Configure physical interfaces for multicast routing."Disabled" is applicable to "lo" or "loopback" interface');

        // ✅ 保留原来的表格干净处理
        var origRender = s.render;
        s.render = function() {
            return origRender.apply(this, arguments).then(node => {
                node.querySelectorAll('.cbi-section-table-descr').forEach(d => d.remove());
                return node;
            });
        };

        o = s.option(form.ListValue, 'direction', _('Direction'));
        o.value('upstream', _('Upstream (toward source)'));
        o.value('downstream', _('Downstream (toward receivers)'));
        o.value('disabled', _('Disabled'));
        //o.default = 'downstream';
        
        o = s.option(widgets.DeviceSelect, 'network', _('Network Interface'));  //显示物理接口等
        o = s.option(widgets.NetworkSelect, 'network', _('Network Interface'));   //只显示别名接口
        o.rmempty = true;
        //o.nocreate = false;
       // o.optional = false;
       // o.unspecified = true;
        o.description = _('Select the network interface to use.');
        //下面内容只在选择物理接口时候打开
        /*
        o.cfgvalue = function(section_id) {
            var v = uci.get('igmpproxy', section_id, 'network');
            if (!v) return v;
            var nets = uci.sections('network');
            for (var i = 0; i < nets.length; i++) {
                if (nets[i]['.name'] === v && nets[i]['.type'] === 'interface')
                    return '@' + v;
            }
            return v;
        };
        o.write = function(section_id, value) {
            if (value && value.startsWith('@'))
                value = value.slice(1);
            return uci.set('igmpproxy', section_id, 'network', value);
        };
*/

        o = s.option(widgets.ZoneSelect, 'zone', _('Firewall Zone'));
        o.description = _('Assign this interface to a firewall zone');

        o = s.option(form.DynamicList, 'altnet', _('Alternative Networks'));
        o.placeholder = _('10.0.0.0/8');
        o.datatype = 'list(cidr)';
        o.description = _('Define additional networks allowed to join multicast.');

        // 返回最终节点
        return m.render().then(formNode => {
            return E([
                statusBar,
                altSection,
                formNode
            ]);
        });
    }
});
