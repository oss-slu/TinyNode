document.addEventListener('DOMContentLoaded', configurePage)

//These are the internal application endpoints, they call out to the RERUM actions.
const CREATE_URL = "create"
const UPDATE_URL = "update"
const QUERY_URL = "query"
const DELETE_URL = "delete"
const OVERWRITE_URL = "overwrite"

/**
 * The UI for controlling which tab shows (which happens to be a form)
 * @param {HTMLElement} form
 */
function showForm(form) {
    let forms = document.getElementsByTagName('form')
    for (let f of forms) {
        f.setAttribute("data-hidden", "true")
    }
    let shownForm = document.getElementById(form)
    shownForm.removeAttribute("data-hidden")
    document.getElementById("obj-viewer").style.display = "none"
    document.getElementById("flash-message").style.display = "none"
}

/**
 * The UI for controlling which tab shows (which happens to be a form)
 * @param {string} msg The text to show
 * @param {string} type A class to provide to color the text 
 */
function setMessage(msg, type) {
    let msgDiv = document.getElementById("flash-message")
    msgDiv.innerHTML = msg
    msgDiv.className = (type) ? type : ""
    msgDiv.style.display = "block"
}

/**
 * The UI for showing resulting JSON objects
 * @param {object} object The object to put into HTML
 */
function setObject(object) {
    let showThis
    if (typeof object !== "object") {
        try {
            showThis = JSON.parse(object)
        } catch (error) {
            showThis = { error: error }
        }
    } else {
        showThis = object
    }
    let viewObject = document.getElementById("obj-viewer")
    viewObject.innerHTML = JSON.stringify(showThis, undefined, 4)
    viewObject.style.display = "block"
}

/**
 * Send a query into RERUM and show the resulting response.
 * @param {HTMLElement} form 
 */
async function queryAction(form) {
    let entries = form.getElementsByTagName("input")
    let query = {}
    query[entries[0].value] = entries[1].value
    fetch(QUERY_URL, {
        method: "POST",
        mode: "cors",
        headers: new Headers({
            'Content-Type': 'application/json; charset=utf-8'
        }),
        body: JSON.stringify(query)
    })
        .then(response => response.json())
        .then(queryResult => {
            if (queryResult.code && queryResult.code >= 400) {
                throw Error(`${queryResult.code}: ${queryResult.message}`)
            }
            setMessage("See all matching results for the query below.")
            setObject(queryResult)
        })
        .catch(err => {
            console.error("There was an error trying to query")
            console.error(err)
            setMessage(err)
            document.getElementById("obj-viewer").style.display = "none"
        })
}

/**
 * Import an object that exists outside of RERUM into RERUM, attributed to this application's RERUM registration agent.
 * @see /src/rerm/tokens/tiny.properties access_token entry for attribution
 * @param {type} form
 */
async function importAction(form) {
    let url = form.getElementsByTagName("input")[0].value
    let origObj = await fetch(url)
        .then(response => response.json())
        .then(objForImport => {
            Object.assign(objForImport, { '@id': url })
            fetch(UPDATE_URL, {
                method: 'PUT',
                body: JSON.stringify(objForImport),
                headers: new Headers({
                    'Content-Type': 'application/json; charset=utf-8'
                })
            })
                .then(response => response.json())
                .then(resultObj => {
                    if (resultObj.code && resultObj.code >= 400) {
                        throw Error(`${resultObj.code}: ${resultObj.message}`)
                    }
                    setMessage("Imported URI " + url + ". See resulting object below.")
                    setObject(resultObj.new_obj_state)
                })
                .catch(err => {
                    console.error("There was an error trying to import object with identifier " + url)
                    console.error(err)
                    setMessage(err)
                    setObject({ error: { message: err.message } }) //This is hidden with the next line of code.  Doesn't have to be.
                    document.getElementById("obj-viewer").style.display = "none"
                })
        })
        .catch(err => {
            console.error("Could not resolve object with identifier '" + url + "'")
            console.error(err)
            setMessage("Could not resolve object with identifier '" + url + "'")
            document.getElementById("obj-viewer").style.display = "none"
        })


}

/**
 * Do a PUT update on an existing RERUM object.  The resulting object is attributed to this application's RERUM registration agent.
 * @see /src/rerm/tokens/tiny.properties access_token entry for attribution
 * @param {type} form
 * @param {object} objIn An optional way to pass the new JSON representation as a parameter
 */
async function updateAction(form, objIn) {
    let uri = form.getElementsByTagName("input")[0].value
    let obj
    if (objIn !== undefined && typeof objIn === "object") {
        obj = objIn
    }
    else {
        obj = form.getElementsByTagName("textarea")[0].value
        try {
            obj = JSON.parse(obj)
        }
        catch (err) {
            console.error("You did not provide valid JSON")
            setMessage("You did not provide valid JSON")
            document.getElementById("obj-viewer").style.display = "none"
            return false
        }
    }
    obj["@id"] = uri
    fetch(UPDATE_URL, {
        method: 'PUT',
        body: JSON.stringify(obj),
        headers: new Headers({
            'Content-Type': 'application/json; charset=utf-8'
        })
    })
        .then(response => {
            if (response.ok) { return response.json() }
            throw Error(`${response.code}: ${response.message}`)
        })
        .then(resultObj => {
            setMessage("Updated URI " + uri + ".  See resulting object below.")
            setObject(resultObj)
        })
        .catch(err => {
            console.error("There was an error trying to update object at " + uri)
            console.error(err)
            setMessage(err)
            setObject({ error: { message: err.message } }) // This is hidden with the next line of code.  Doesn't have to be.
            document.getElementById("obj-viewer").style.display = "none"
        })
}

/**
 * Provide a JSON object to create in RERUM.  The resulting object is attributed to this application's RERUM registration agent.
 * @see /src/rerm/tokens/tiny.properties access_token entry for attribution
 * @param {type} form
 */
async function createAction(form) {
    let obj = form.getElementsByTagName("textarea")[0].value
    try {
        obj = JSON.parse(obj)
    } catch (error) {
        console.error("You did not provide valid JSON")
        setMessage("You did not provide valid JSON")
        document.getElementById("obj-viewer").style.display = "none"
        return false
    }
    fetch(CREATE_URL, {
        method: 'POST',
        body: JSON.stringify(obj),
        headers: new Headers({
            'Content-Type': 'application/json; charset=utf-8'
        })
    })
        .then(response => {
            const locationHeader = response.headers.get("Location") ?? response.headers.get("location")
            if (response?.code >= 400) {
                throw Error(`${response?.code}: ${response.statusText}`)
            }
            setMessage(`Created new object at ${locationHeader ?? MISSING}.  See result below.`)
            setObject(Object.assign({ '@id': locationHeader }, obj))
        })
        .catch(err => {
            console.error("There was an error trying to create object")
            console.error(err)
            setMessage(err.message)
            setObject({ error: { message: err.message } }) //This is hidden with the next line of code.  Doesn't have to be.
            document.getElementById("obj-viewer").style.display = "none"
        })
}

/**
  * Provide the URL of a RERUM object to delete.  Only those objects attributed to this application's RERUM registration agent can be deleted.
  * @see /src/rerm/tokens/tiny.properties access_token entry for attribution
  * @param {type} form
  */
async function deleteAction(form) {
    let url = form.getElementsByTagName("input")[0].value
    fetch(`${DELETE_URL}/${url.split('id/').pop()}`, {
        method: 'DELETE',
        headers: new Headers({
            'Content-Type': 'text/plain; charset=utf-8'
        })
    })
        .then(response => {
            if (response.status === 204) {
                setMessage("Object Deleted.  See result below.")
                fetch(url).then(resp => resp.json()).then(deletedObj => setObject(deletedObj))
            }
            else {
                //There was an error
                console.error("There was an error trying to delete object")
                console.error(response.statusText)
                setMessage(response.statusText)
                document.getElementById("obj-viewer").style.display = "none"
            }
        })
        .catch(err => {
            console.error("There was an error trying to delete object")
            console.error(err)
            document.getElementById("obj-viewer").style.display = "none"
            setMessage(err)
        })
}

/**
 * Overwrite the representation of a JSON object at a given URL. Note this will not create a new node in history, it will overwrite the existing node.
 * TOnly those objects attributed to this application's RERUM registration agent can be overwritten.
 * @see /src/rerm/tokens/tiny.properties access_token entry for attribution
 * @param {type} form
 * @param {object} objIn An optional way to pass the new JSON representation as a parameter
 */
async function overwriteAction(form, objIn) {
    let uri = form.getElementsByTagName("input")[0].value
    let obj
    if (objIn !== undefined && typeof objIn === "object") {
        obj = objIn
    }
    else {
        obj = form.getElementsByTagName("textarea")[0].value
        try {
            obj = JSON.parse(obj)
        }
        catch (err) {
            console.error("You did not provide valid JSON")
            setMessage("You did not provide valid JSON")
            document.getElementById("obj-viewer").style.display = "none"
            return false
        }
    }
    obj["@id"] = uri
    fetch(OVERWRITE_URL, {
        method: 'PUT',
        body: JSON.stringify(obj),
        headers: new Headers({
            'Content-Type': 'application/json; charset=utf-8'
        })
    })
        .then(response => {
            setMessage(`URI ${uri} overwritten at ${response.headers.get("Location") ?? response.headers.get("location")}. See resulting object below:`)
            setObject(obj)
        })
        .catch(err => {
            if (err?.code >= 400) {
                setMessage(`${resultObj.code}: ${resultObj.message}`)
            } else {
                console.error("There was an error trying to overwrite object at " + uri)
                console.error(err)
                setMessage(err)
            }
        })
}

function configurePage(loadEvent) {
    document.querySelectorAll('[data-lang-key]').forEach(el=>el.textContent=config.langKey[el.dataset.langKey])
}
