include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-igmpproxy
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_MAINTAINER:=OpenWrt Community

LUCI_TITLE:=LuCI Support for IGMP Proxy
LUCI_DEPENDS:=+igmpproxy
LUCI_PKGARCH:=all

# 新增：声明语言目录
LUCI_LANG:=zh_Hans

include $(TOPDIR)/feeds/luci/luci.mk

PKG_BUILD_DIR := $(BUILD_DIR)/$(PKG_NAME)

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/controller
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/model/cbi
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/view

	$(INSTALL_DATA) ./luasrc/controller/igmpproxy.lua $(1)/usr/lib/lua/luci/controller/
	$(INSTALL_DATA) ./luasrc/model/cbi/igmpproxy.lua $(1)/usr/lib/lua/luci/model/cbi/
	$(INSTALL_DATA) ./luasrc/view/igmpproxy_status.htm $(1)/usr/lib/lua/luci/view/
endef

# ✅ 新增：语言文件编译与安装规则
define Package/luci-i18n-igmpproxy-zh-cn/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/i18n
	$(INSTALL_DATA) ./po/zh_Hans/igmpproxy.po $(1)/usr/lib/lua/luci/i18n/igmpproxy.zh-cn.po
endef

# ✅ 新增：生成中文语言包
define Package/luci-i18n-igmpproxy-zh-cn
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI translation for IGMP Proxy (Simplified Chinese)
  PKGARCH:=all
  DEPENDS:=luci-app-igmpproxy
endef

# 调用标准构建规则
$(eval $(call BuildPackage,$(PKG_NAME)))
$(eval $(call BuildPackage,luci-i18n-igmpproxy-zh-cn))
