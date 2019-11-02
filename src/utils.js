'use strict'
/* eslint-env browser, webextensions */

const multiaddr = require('multiaddr')

function isMultiaddress (addr) {
  if (addr === null || addr === undefined || typeof addr === 'undefined') {
    return false
  }

  try {
    multiaddr(addr)
    return true
  } catch (_) {
    return false
  }
}

function isURL (addr) {
  if (addr === null || addr === undefined || typeof addr === 'undefined') {
    return false
  }

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
