# luci-app-igmpproxy Makefile

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-igmpproxy
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=You
PKG_LICENSE:=Apache-2.0

LUCI_TITLE:=LuCI support for igmpproxy
LUCI_DEPENDS:=+luci-compat +igmpproxy
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# OpenWrt buildroot
# call BuildPackage
