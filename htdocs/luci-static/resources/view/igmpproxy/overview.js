'use strict';
'require form';
'require tools.widgets as widgets';
'require uci';
'require fs';

return L.view.extend({
    load: function() {
        return fs.stat('/etc/config/igmpproxy').then(() => {
            // 文件存在，正常加载
            return uci.load('igmpproxy');
        }).catch((err) => {
            // 文件不存在，创建默认配置
            return this.createDefaultConfig();
        }).then(() => {
            // 同时加载 firewall 配置
            return uci.load('firewall');
        });
    },

    createDefaultConfig: function() {
        // 创建包含默认配置的初始文件
        var defaultConfig = [
            "config igmpproxy",
            "\toption quickleave '1'",
            "\toption verbose '1'",
            ""
        ].join('\n');

        return fs.write('/etc/config/igmpproxy', defaultConfig)
            .then(() => {
                // 重新加载配置
                return uci.load('igmpproxy');
            })
            .catch((err) => {
                console.error('Failed to create default igmpproxy config:', err);
                throw err;
            });
    },

    render: function() {
        var m, s, o;

        m = new form.Map('igmpproxy', _('IGMP Proxy'),
            _('IGMP Proxy allows multicast traffic to be properly forwarded between networks.'));

        /* General settings */
        s = m.section(form.TypedSection, 'igmpproxy', _('General Settings'));
        s.anonymous = true;

        o = s.option(form.Flag, 'quickleave', _('Quick Leave'));
        o.description = _('Send leave messages immediately on departure of the last member.');
        o.default = '1';

        o = s.option(form.ListValue, 'verbose', _('Verbose Level'));
        o.value('0', _('0 - None'));
        o.value('1', _('1 - Minimal'));
        o.value('2', _('2 - More'));
        o.value('3', _('3 - Maximum'));
        o.default = '1';

        /* Physical interfaces */
        s = m.section(form.TypedSection, 'phyint', _('Physical Interfaces'));
        s.anonymous = false;
        s.addremove = true;
        s.description = _('Configure physical interfaces for multicast routing.');

        /* Network interface */
        o = s.option(widgets.DeviceSelect, 'network', _('Network Interface'));
        o.nocreate = false;
        o.optional = false;
        o.unspecified = true;
        o.rmempty = true;

        /* 删除 @ */
        o.write = function(section_id, value) {
            if (value)
                value = value.replace(/^@/, '');
            return uci.set('igmpproxy', section_id, 'network', value);
        };

        /* Firewall Zone */
        o = s.option(widgets.ZoneSelect, 'zone', _('Firewall Zone'));
        o.nocreate = false;
        o.multiple = false;
        o.optional = true;
        o.unspecified = true;
        o.rmempty = true;
        o.description = _('Assign this interface to a firewall zone');

        /* 删除 @ */
        o.write = function(section_id, value) {
            if (value)
                value = value.replace(/^@/, '');
            return uci.set('igmpproxy', section_id, 'zone', value);
        };

        /* Direction */
        o = s.option(form.ListValue, 'direction', _('Direction'));
        o.value('upstream', _('Upstream (toward source)'));
        o.value('downstream', _('Downstream (toward receivers)'));
        o.value('disabled', _('Disabled'));
        o.default = 'downstream';

        /* Alternative networks */
        o = s.option(form.DynamicList, 'altnet', _('Alternative Networks'));
        o.placeholder = '192.168.1.0/24';
        o.description = _('Additional networks considered as directly connected');
        o.datatype = 'list(cidr)';

        return m.render();
    }
});
