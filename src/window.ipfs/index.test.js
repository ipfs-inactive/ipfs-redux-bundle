/* global it, expect, jest */
const tryCompanion = require('./index.js')

it('Should connect to window.ipfs', async (done) => {
  const opts = {
    root: {
      ipfs: {}
    },
    ipfsConnectionTest: jest.fn().mockResolvedValueOnce(true)
  }
  const res = await tryCompanion(opts)
  expect(res.ipfs).toEqual(opts.root.ipfs)
  expect(res.provider).toEqual('window.ipfs')
  expect(opts.ipfsConnectionTest.mock.calls.length).toBe(1)
  done()
})
