/* global jest, it, expect */
const { composeBundlesRaw } = require('redux-bundler')
const windowIpfsFallback = require('window.ipfs-fallback')
const ipfsBundle = require('./index')

jest.mock('window.ipfs-fallback')

it('should initialise IPFS API via window.ipfs-fallback', (done) => {
  const testIdentity = { hello: 'window.ipfs-fallback' }
  windowIpfsFallback.mockResolvedValue({
    id: jest.fn().mockResolvedValue(testIdentity)
  })
  const store = composeBundlesRaw(
    ipfsBundle()
  )()

  expect(store.selectIpfsReady()).toBe(false)
  store.subscribeToSelectors(['selectIpfsReady'], () => {
    expect(store.selectIpfsReady()).toBe(true)
    expect(store.selectIpfsIdentity()).toBe(testIdentity)
    done()
  })
  store.doInitIpfs()
})

it('should initialise IPFS API by accessing it directly when running inside of ipfs-companion', (done) => {
  const testWebExtIdentity = { hello: 'ipfsCompanion.ipfs' }
  // browser.runtime.getBackgroundPage().ipfsCompanion.ipfs will be present
  // only if page was loaded from a path that belongs to our browser extension
  global.browser = {
    get runtime () {
      return {
        getBackgroundPage: async function () {
          return {
            get ipfsCompanion () {
              return {
                get ipfs () {
                  return {
                    id: async function () {
                      return testWebExtIdentity
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const store = composeBundlesRaw(
    ipfsBundle()
  )()

  expect(store.selectIpfsReady()).toBe(false)
  store.subscribeToSelectors(['selectIpfsReady'], () => {
    expect(store.selectIpfsReady()).toBe(true)
    expect(store.selectIpfsIdentity()).toBe(testWebExtIdentity)
    done()
  })
  store.doInitIpfs()
})
