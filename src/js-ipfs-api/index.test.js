/* global it, expect, jest */
const tryApi = require('./index.js')
const { URL } = require('url')
const httpClient = require('ipfs-http-client')

it('Should use the apiAddress (implicit http)', async (done) => {
  const opts = {
    apiAddress: '/ip4/1.1.1.1/tcp/1111',
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://localhost:5001'),
    httpClient,
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual(opts.apiAddress)
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  const config = res.ipfs.getEndpointConfig()
  expect(config.host).toEqual('1.1.1.1')
  expect(config.port).toEqual('1111')
  expect(config.protocol).toEqual('http')
  done()
})

it('Should use the apiAddress (explicit https)', async (done) => {
  const opts = {
    apiAddress: '/ip4/1.1.1.1/tcp/1111/https',
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://localhost:5001'),
    httpClient,
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual(opts.apiAddress)
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  const config = res.ipfs.getEndpointConfig()
  expect(config.host).toEqual('1.1.1.1')
  expect(config.port).toEqual('1111')
  expect(config.protocol).toEqual('https')
  done()
})

it('Should use the http location where hostname not localhost', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://dev.local:5001'),
    httpClient,
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual('/dns4/dev.local/tcp/5001/http')
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  const config = res.ipfs.getEndpointConfig()
  expect(config.host).toEqual('dev.local')
  expect(config.port).toEqual('5001')
  expect(config.protocol).toEqual('http')
  done()
})

it('Should use the https location where hostname not localhost', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('https://dev.local:5001'),
    httpClient,
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual('/dns4/dev.local/tcp/5001/https')
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  const config = res.ipfs.getEndpointConfig()
  expect(config.host).toEqual('dev.local')
  expect(config.port).toEqual('5001')
  expect(config.protocol).toEqual('https')
  done()
})

it('Should use the implicit/default location port', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('https://webui.ipfs.io'),
    httpClient,
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual('/dns4/webui.ipfs.io/tcp/443/https')
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  const config = res.ipfs.getEndpointConfig()
  expect(config.host).toEqual('webui.ipfs.io')
  expect(config.port).toEqual('443')
  expect(config.protocol).toEqual('https')
  done()
})

it('Should use the defaultApiAddress if location fails', async (done) => {
  const opts = {
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://astro.cat:5001'),
    httpClient,
    // location call fails, default ok
    ipfsConnectionTest: jest.fn()
      .mockRejectedValueOnce(new Error('nope'))
      .mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual(opts.defaultApiAddress)
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(2)
  const config = res.ipfs.getEndpointConfig()
  expect(config.host).toEqual('127.0.0.1')
  expect(config.port).toEqual('5001')
  expect(config.protocol).toEqual('http')
  done()
})

it('Should use the apiAddress (url)', async (done) => {
  const opts = {
    apiAddress: 'http://1.1.1.1:1111',
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://localhost:5001'),
    httpClient,
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual(opts.apiAddress)
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  const config = res.ipfs.getEndpointConfig()
  expect(config.host).toEqual('1.1.1.1')
  expect(config.port).toEqual('1111')
  expect(config.protocol).toEqual('http')
  done()
})

it('Should use the apiAddress (url with basic auth)', async (done) => {
  const opts = {
    apiAddress: 'http://user:pass@1.1.1.1:1111',
    defaultApiAddress: '/ip4/127.0.0.1/tcp/5001',
    location: new URL('http://localhost:5001'),
    httpClient,
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryApi(opts)
  expect(res.apiAddress).toEqual(opts.apiAddress)
  expect(res.provider).toEqual('js-ipfs-api')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  const config = res.ipfs.getEndpointConfig()
  expect(config.host).toEqual('1.1.1.1')
  expect(config.port).toEqual('1111')
  expect(config.protocol).toEqual('http')
  done()
})
