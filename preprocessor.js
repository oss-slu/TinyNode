/**
 * Middleware for preprocessing documents to contain the expected format.
 * @author cubap
 */

// expressjs middleware for preprocessing documents. Use the jsonld library to make sure the "@id" and "@type" fields are included on the JSON object in the request.body
import * as jsonld from 'jsonld'

const preprocessor = async (req, res, next) => {
    if (typeof req.body !== 'object' || req.body === null) {
        // if the request body is not an object, return an error
        return res.status(400).json({ error: 'Invalid request body' })
    }
    let missingProps = []
    // check if the JSON object has an "@id" field
    if (!req.body.hasOwnProperty('@id')) {
        missingProps.push('@id')
    }
    // check if the JSON object has an "@type" field
    if (!req.body.hasOwnProperty('@type')) {
        missingProps.push('@type')
    }
    if (missingProps.length) {
        if (!req.body.hasOwnProperty('@context')) {
            // cannot look for any aliases
            return res.status(400).json({ error: `Missing required properties: @context, ${missingProps.join(', ')}` })
        }
        const LD = new jsonld.JsonLdProcessor()
        // look for aliases in the @context
        const id = await LD.compact(req.body, req.body['@context'])
        .then(compacted => {
            if (!compacted.hasOwnProperty('@id')) {
                req.body['@id'] = compacted['@id']
            }
            return compacted['@id']
        })
        .catch(err => {
            return res.status(400).json({ error: `Missing required property: @id` })
        })
        const type = await LD.compact(req.body, req.body['@context'])
        .then(compacted => {
            if (!compacted.hasOwnProperty('@type')) {
                req.body['@type'] = compacted['@type']
            }
            return compacted['@type']
        })
        .catch(err => {
            return res.status(400).json({ error: `Missing required property: @type` })
        })
        return Promise.all([id ?? Promise.resolve(true), type ?? Promise.resolve(true)])
    }
    // continue to the next middleware or route handler
    next()
}
