const express = require('express')
const router = express.Router()
const got = require('got')
const fetch = (...args) => import('node-fetch').then(() => fetch(...args))

/* POST a query to the thing. */
router.post('/', async (req, res, next) => {
  const lim = req.query.limit ?? 0
  const skip = req.query.skip ?? 0

  const queryBody = req.body

  // check body for JSON
  // check limit and skip for INT

  const queryOptions = {
    json: queryBody,
    headers: {
      'user-agent':'Tiny-Node',
      'Authorization': `Bearer ${process.env.RERUM_TOKEN}` // not required for query
    }
  }
  try {
    const queryURL = `${process.env.RERUM_URL}${process.env.QUERY}?limit=${lim}&skip=${skip}`
    const results = await got.post(queryURL,queryOptions).json()
    res.status(200)
    res.send(results)
  } 
  catch (err) {
    console.log(err)
    res.status(500).send("Caught Error:" + err)
  }
})

module.exports = router
