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

    render: function() {
        var m = new form.Map('igmpproxy', _('IGMP Proxy'),
            _('IGMP Proxy allows multicast traffic to be properly forwarded between networks，ipv4 only.by:github.com/xiaren2'));

        // ===== 状态栏 =====
        var statusText = E('span', { 'id': 'igmpproxy_status' }, _('Checking status...'));

        var btnStart = E('button', {
            'class': 'btn cbi-button cbi-button-apply',
            'click': L.bind(() => this.handleService('start'), this)
        }, _('Start'));

        var btnStop = E('button', {
            'class': 'btn cbi-button cbi-button-reset',
            'click': L.bind(() => this.handleService('stop'), this)
        }, _('Stop'));

        var btnRestart = E('button', {
            'class': 'btn cbi-button',
            'click': L.bind(() => this.handleService('restart'), this)
        }, _('Restart'));

        var btnRefresh = E('button', {
            'class': 'btn cbi-button',
            'click': function() {
                window.location.reload(true); // 强制刷新页面
            }
        }, _('Refresh'));

        var statusBar = E('div', { 'class': 'cbi-section' }, [
            E('p', {}, [_('Status: '), statusText]),
            E('div', { 'style': 'margin-top:10px' }, [
                btnStart, ' ', btnStop, ' ', btnRestart, ' ', btnRefresh
            ])
        ]);

        // 自动刷新状态
        if (!this.statusPoll) {
            this.statusPoll = poll.add(() => this.updateStatus(statusText, btnStart, btnStop, btnRestart));
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
        s.description = _('Configure physical interfaces for multicast routing.\"Disabled\" is applicable to \"lo\" or \"loopback\" interface');

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
        o.default = 'downstream';

        o = s.option(widgets.DeviceSelect, 'network', _('Network Interface'));
        o.rmempty = false;
        o.description = _('Select the network interface to use.');
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

        o = s.option(widgets.ZoneSelect, 'zone', _('Firewall Zone'));
        o.description = _('Assign this interface to a firewall zone');

        o = s.option(form.DynamicList, 'altnet', _('Alternative Networks'));
        o.placeholder = _('10.0.0.0/8');
        o.datatype = 'list(cidr)';
        o.description = _('Define additional networks allowed to join multicast.');

        return m.render().then(node => {
            node.insertBefore(statusBar, node.firstChild);
            return node;
        });
    }
});
