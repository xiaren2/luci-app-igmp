include $(TOPDIR)/rules.mk

PKG_NAME:=luci-i18n-igmpproxy-zh-cn
PKG_VERSION:=1.0
PKG_RELEASE:=1

LUCI_TITLE:=IGMP Proxy Chinese language pack
LUCI_DEPENDS:=+luci-base
PKG_MAINTAINER:=OpenWrt Community
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

LUCI_LANG:=zh-cn

define Package/luci-i18n-igmpproxy-zh-cn/install
	# 语言文件放入正确路径
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/i18n
	$(INSTALL_DATA) ./luci-i18n-igmpproxy-zh-cn.po $(1)/usr/lib/lua/luci/i18n/igmpproxy.zh-cn.lmo

	# 修复：创建空的 /etc/uci-defaults 脚本，防止安装时报错
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	echo "#!/bin/sh" > $(1)/etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
	echo "exit 0" >> $(1)/etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
	chmod 0755 $(1)/etc/uci-defaults/luci-i18n-igmpproxy-zh-cn
endef

$(eval $(call BuildPackage,luci-i18n-igmpproxy-zh-cn))
