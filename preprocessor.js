/**
 * Middleware for preprocessing documents to contain the expected format.
 * @author cubap
 */

// expressjs middleware for preprocessing documents. Use the jsonld library to make sure the "@id" and "@type" fields are included on the JSON object in the request.body
import LD from 'jsonld'

const rerumPropertiesWasher = async (req, res, next) => {
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
    if (!missingProps.includes('@id')) { 
        next()
        return
    } // continue to the next middleware or route handler
    if (!req.body.hasOwnProperty('@context')) {
        // cannot look for any aliases
        return res.status(400).json({ error: `Missing required properties: @context, ${missingProps.join(', ')}` })
    }
    // look for aliases in the @context
    return LD.compact(req.body, req.body['@context'])
        .then(compacted => {
            for (const prop of missingProps) {
                if (compacted.hasOwnProperty(prop)) {
                    req.body[prop] = compacted[prop]
                }
            }
            next()
        })
        .catch(err => {
            next(err)
        })
}

export default rerumPropertiesWasher
