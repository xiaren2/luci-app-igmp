include $(TOPDIR)/rules.mk

PKG_NAME:=luci-i18n-igmpproxy-zh-cn
PKG_VERSION:=1.0
PKG_RELEASE:=1

LUCI_TITLE:=IGMP Proxy Chinese language pack
LUCI_DEPENDS:=+luci-base +luci-app-igmpproxy
PKG_MAINTAINER:=OpenWrt Community
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# 定义语言类型
LUCI_LANG:=zh-cn

# 编译 .po 为 .lmo
define Build/Compile
    $(STAGING_DIR_HOST)/bin/po2lmo $(PKG_BUILD_DIR)/luci-i18n-igmpproxy-zh-cn.po $(PKG_BUILD_DIR)/igmpproxy.$(LUCI_LANG).lmo
endef

# 安装阶段
define Package/$(PKG_NAME)/install
    # 创建语言文件目录
    $(INSTALL_DIR) $(1)/usr/lib/lua/luci/i18n
    
    # 安装编译后的语言文件
    $(INSTALL_DATA) $(PKG_BUILD_DIR)/igmpproxy.$(LUCI_LANG).lmo $(1)/usr/lib/lua/luci/i18n/
    
    # 修复：创建必要的 uci-defaults 脚本（即使为空）
    $(INSTALL_DIR) $(1)/etc/uci-defaults
    echo "#!/bin/sh" > $(1)/etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
    echo "# 语言包安装后处理脚本" >> $(1)/etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
    echo "# 此文件必须存在以防止 opkg 报错" >> $(1)/etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
    echo "logger -t luci-i18n 'IGMP Proxy 中文语言包安装完成'" >> $(1)/etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
    echo "exit 0" >> $(1)/etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
    
    # 设置正确的文件权限
    chmod 0755 $(1)/etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
endef

# 定义 postinst 脚本（覆盖默认行为）
define Package/$(PKG_NAME)/postinst
#!/bin/sh
[ -n "$${IPKG_INSTROOT}" ] || {
    # 仅在目标设备上执行（不在构建过程中执行）
    (. /etc/uci-defaults/luci-i18n-igmpproxy-zh-cn) && rm -f /etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
    exit 0
}
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
