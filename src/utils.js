'use strict'
/* eslint-env browser, webextensions */

const multiaddr = require('multiaddr')

function isMultiaddress (addr) {
  try {
    multiaddr(addr)
    return true
  } catch (_) {
    return false
  }
}

function isURL (addr) {
  try {
    // eslint-disable-next-line
    new URL(addr)
    return true
  } catch (e) {
    return false
  }
}

module.exports = {
  isMultiaddress,
  isURL
}
