include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-igmpproxy
PKG_VERSION:=1.0
PKG_RELEASE:=1
PKG_MAINTAINER:=OpenWrt Community

LUCI_TITLE:=LuCI Support for IGMP Proxy
LUCI_DEPENDS:=+igmpproxy
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

LUCI_LANGUAGES := zh-cn
# 指定源文件目录
PKG_BUILD_DIR := $(BUILD_DIR)/$(PKG_NAME)

# 安装阶段：将 LuCI 控制器、模型、视图文件复制到正确路径
define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/controller
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/model/cbi
	$(INSTALL_DIR) $(1)/usr/lib/lua/luci/view

	$(INSTALL_DATA) ./luasrc/controller/igmpproxy.lua $(1)/usr/lib/lua/luci/controller/
	$(INSTALL_DATA) ./luasrc/model/cbi/igmpproxy.lua $(1)/usr/lib/lua/luci/model/cbi/
	$(INSTALL_DATA) ./luasrc/view/igmpproxy_status.htm $(1)/usr/lib/lua/luci/view/
endef

# 调用标准构建规则
$(eval $(call BuildPackage,$(PKG_NAME)))

