import { OrderedMap, Map } from 'immutable'

export function parseJSON (response) {
  try {
    return response.json()
  } catch (e) {
    // Not a json, pass
  }
}

export function dataToMap (json) {
  function mapChildren (content) {
    if (content.has('children')) {
      const children = content.get('children').reduce((subacc, item) => {
        const mapItem = Map(item)
        return subacc.set(item.id, mapChildren(mapItem))
      }, new OrderedMap())
      content = content.set('children', children)
    }
    return content
  }

  return json.data.reduce((acc, item) => {
    let content = Map(item.attributes)

    // Special handling for tree structures, like Category
    content = mapChildren(content)
    return acc.set(item.id, content)
  }, new OrderedMap())
}

export function singleToMap (json) {
  const attr = Map(json.data.attributes)
  return OrderedMap().set(json.data.id, attr)
}

export function mapToData (id, item) {
  return {
    data: {
      id,
      attributes: item.toJS()
    }
  }
}

export function checkApiError (json) {
  if (typeof json === 'undefined') {
    return json
  }
  if (Object.prototype.hasOwnProperty.call(json, 'errors')) {
    json.errors.forEach((e) => {
      window.notifications.addNotification(
        {
          title: e.title + '(' + e.code + ')',
          message: e.detail,
          level: 'error',
          position: 'bl',
          autoDismiss: 10
        }
      )
    })
    throw new Error(json.errors[0].code)
  } else {
    return json
  }
}

export function dateToYMD (date) {
  const d = date.getDate()
  const m = date.getMonth() + 1
  const y = date.getFullYear()
  return '' + y + '-' + (m <= 9 ? '0' + m : m) + '-' + (d <= 9 ? '0' + d : d)
}
