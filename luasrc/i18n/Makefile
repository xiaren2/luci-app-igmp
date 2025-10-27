include $(TOPDIR)/rules.mk

LUCI_TITLE:=IGMP Proxy Chinese language pack
LUCI_DEPENDS:=+luci-base
PKG_MAINTAINER:=OpenWrt Community
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

LUCI_LANG:=zh-cn

define Package/luci-i18n-igmpproxy-zh-cn/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/i18n
	$(INSTALL_DATA) ./luci-i18n-igmpproxy-zh-cn.po $(1)/usr/lib/lua/luci/i18n/luci-i18n-igmpproxy-zh-cn.po
endef

$(eval $(call BuildPackage,luci-i18n-igmpproxy-zh-cn))
