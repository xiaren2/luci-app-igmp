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
            return uci.save().then(() => uci.apply());
        }

        return Promise.resolve();
    },

    handleService: function(action) {
        return fs.exec('/etc/init.d/igmpproxy', [action]);
    },

    render: function() {

        var m = new form.Map('igmpproxy', _('IGMP Proxy'),
            _('IGMP Proxy allows multicast traffic to be properly forwarded between networks，ipv4 only.by:github.com/xiaren2'));

        // ===== 状态 + 按钮 =====
        var statusText = E('span', { 'id': 'igmpproxy_status' }, _('Checking status...'));

        var btnStart = E('button', {
            'class': 'btn cbi-button cbi-button-apply',
            'click': L.bind(() => this.handleService('start'), this)
        }, _('启动'));

        var btnStop = E('button', {
            'class': 'btn cbi-button cbi-button-reset',
            'click': L.bind(() => this.handleService('stop'), this)
        }, _('停止'));

        var btnRestart = E('button', {
            'class': 'btn cbi-button',
            'click': L.bind(() => this.handleService('restart'), this)
        }, _('重启'));

        var statusBar = E('div', { 'class': 'cbi-section' }, [
            E('p', {}, [_('运行状态：'), statusText]),
            E('div', { 'style': 'margin-top:10px' }, [
                btnStart, ' ', btnStop, ' ', btnRestart
            ])
        ]);

        // ===== 定时刷新状态 =====
        poll.add(() => {
            fs.exec('/bin/pidof', ['igmpproxy']).then(res => {
                if (res.code === 0 && res.stdout.trim()) {
                    let pids = res.stdout.trim().split(/\s+/);
                    let pidText = pids.length > 1 ? pids.join(', ') : pids[0];
                    statusText.innerHTML = '<b style="color:green">运行中</b> (PID: ' + pidText + ')';
                    
                    // 更新按钮状态
                    btnStart.disabled = true;
                    btnStop.disabled = false;
                    btnRestart.disabled = false;
                } else {
                    statusText.innerHTML = '<b style="color:red">未运行</b>';
                    
                    // 更新按钮状态
                    btnStart.disabled = false;
                    btnStop.disabled = true;
                    btnRestart.disabled = true;
                }
            });
        });

        // ===== General Settings =====
        var igmpSections = uci.sections('igmpproxy', 'igmpproxy');
        var firstSection = igmpSections.length > 0 ? igmpSections[0]['.name'] : 'config';

        var s = m.section(form.NamedSection, firstSection, 'igmpproxy', _('General Settings'));
        s.anonymous = false;
        s.addremove = false;

        var o = s.option(form.Flag, 'quickleave', _('Quick Leave'));
        o.default = '1';
        o.description = _('Send leave messages immediately on departure of the last member.');

        o = s.option(form.ListValue, 'verbose', _('Verbose Level'));
        o.value('0', _('0 - None'));
        o.value('1', _('1 - Minimal'));
        o.value('2', _('2 - More'));
        o.value('3', _('3 - Maximum'));
        o.default = '1';
        o.description = _('0=none, 1=minimal, 2=more, 3=max');

        // ===== GridSection =====
        s = m.section(form.GridSection, 'phyint', _('Physical Interfaces'));
        s.anonymous = false;
        s.addremove = true;
        s.description = _('Configure physical interfaces for multicast routing.\"Disabled\" is applicable to \"lo\" or \"loopback\" interface');

        // 🔥 去掉表格 description 行
        var origRender = s.render;
        s.render = function() {
            return origRender.apply(this, arguments).then(node => {
                node.querySelectorAll('.cbi-section-table-descr').forEach(d => d.remove());
                return node;
            });
        };

        // Direction
        o = s.option(form.ListValue, 'direction', _('Direction'));
        o.value('upstream', _('Upstream (toward source)'));
        o.value('downstream', _('Downstream (toward receivers)'));
        o.value('disabled', _('Disabled'));
        o.default = 'downstream';
        o.description = _('Select the multicast routing direction');

        // Network (DeviceSelect)
        o = s.option(widgets.DeviceSelect, 'network', _('Network Interface'));
        o.nocreate = false;
        o.optional = false;
        o.unspecified = true;
        o.rmempty = true;
        o.description = _('Select the network interface to use.');

        // 🔑 核心：cfgvalue 显示 @ 前缀，write 保存去掉 @
        o.cfgvalue = function(section_id) {
            var v = uci.get('igmpproxy', section_id, 'network');
            if (!v) return v;

            var netSections = uci.sections('network') || [];
            for (var i = 0; i < netSections.length; i++) {
                var ns = netSections[i];
                if (ns['.name'] === v && ns['.type'] === 'interface') {
                    return '@' + v; // UI 显示别名
                }
            }
            return v;
        };

        o.write = function(section_id, value) {
            if (value && value.startsWith('@')) {
                value = value.slice(1); // 保存去掉 @
            }
            return uci.set('igmpproxy', section_id, 'network', value);
        };

        // Firewall Zone
        o = s.option(widgets.ZoneSelect, 'zone', _('Firewall Zone'));
        o.optional = true;
        o.rmempty = true;
        o.description = _('Assign this interface to a firewall zone');

        // Alternative Networks
        o = s.option(form.DynamicList, 'altnet', _('Alternative Networks'));
        o.placeholder = '10.0.0.0/8';
        o.datatype = 'list(cidr)';
        o.description = _('Define additional networks allowed to join multicast.');

        return m.render().then(node => {
            node.insertBefore(statusBar, node.firstChild);
            return node;
        });
    
