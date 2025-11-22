'use strict';
'require form';
'require tools.widgets as widgets';
'require uci';
'require fs';

return L.view.extend({
    load: function() {
        return fs.stat('/etc/config/igmpproxy')
            .then(() => uci.load('igmpproxy'))
            .catch(() => this.createDefaultConfig())
            .then(() => this.ensureIgmpProxySection())
            .then(() => uci.load('firewall'))
            .then(() => uci.load('network')); // 加载 network，供 cfgvalue 检查使用
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
        var section = sections[0];
        if (!section.quickleave) {
            uci.set('igmpproxy', section['.name'], 'quickleave', '1');
            return uci.save().then(() => uci.apply());
        }
        return Promise.resolve();
    },

    render: function() {
        var m = new form.Map('igmpproxy', _('IGMP Proxy'),
            _('IGMP Proxy allows multicast traffic to be properly forwarded between networks，ipv4 only.by:github.com/xiaren2'));

        // ===== General Settings (垂直布局) =====
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
        
        // ===== Physical Interfaces (表格) =====
        s = m.section(form.GridSection, 'phyint', _('Physical Interfaces'));
        s.anonymous = false;
        s.addremove = true;
        s.description = _('Configure physical interfaces for multicast routing.\"Disabled\" is applicable to \"lo\" or \"loopback\" interface');

        o = s.option(form.ListValue, 'direction', _('Direction'));
        o.value('upstream', _('Upstream (toward source)'));
        o.value('downstream', _('Downstream (toward receivers)'));
        o.value('disabled', _('Disabled'));
        o.default = 'downstream';
        o.description = _('Select the multicast routing direction');
        
        o = s.option(widgets.DeviceSelect, 'network', _('Network Interface'));
        o.nocreate = false;
        o.optional = false;
        o.unspecified = true;
        o.rmempty = true;
        o.description = _('Select the network interface to use.');
 /**
         * cfgvalue: 从 UCI 读取的值 => 返回给 DeviceSelect 的显示值
         *
         * 逻辑：
         *  - 如果 v 是空，返回 v（空）
         *  - 如果 /etc/config/network 中存在 type 为 'interface' 且名字为 v 的 section（即 logical interface），
         *      则返回 '@' + v，让 DeviceSelect 在 UI 上以别名形式显示（@lan）
         *  - 否则直接返回 v（物理设备名或其他字符串），避免错误地加上 @
         */
        o.cfgvalue = function(section_id) {
            var v = uci.get('igmpproxy', section_id, 'network');
            if (!v) return v;

            // 遍历 network 配置，查找是否存在名字为 v 的 interface section
            var netSections = uci.sections('network') || [];
            for (var i = 0; i < netSections.length; i++) {
                var ns = netSections[i];
                if (ns['.name'] === v && ns['.type'] === 'interface') {
                    // 只有当它确实是 network 的 interface section 时才加 @
                    return '@' + v;
                }
            }

            // 否则不要加 @（保持物理设备名或原始值）
            return v;
        };

        // 保存时：如果前端传回 @xxx，去掉 @ 并写入真实名字（UCI 不应包含 @）
        o.write = function(section_id, value) {
            if (value && value.startsWith('@'))
                value = value.slice(1);
            return uci.set('igmpproxy', section_id, 'network', value);
        };  

        o = s.option(widgets.ZoneSelect, 'zone', _('Firewall Zone'));
        o.nocreate = false;
        o.multiple = false;
        o.optional = true;
        o.unspecified = true;
        o.rmempty = true;
        o.description = _('Assign this interface to a firewall zone');
        
        o = s.option(form.DynamicList, 'altnet', _('Alternative Networks'));
        o.placeholder = '10.0.0.0/8';
        o.datatype = 'list(cidr)';
        o.description = _('Define additional networks allowed to join multicast.');
        return m.render();
    }
});
