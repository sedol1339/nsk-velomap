const route_icon_start = L.divIcon({className: "route_icon_start"})
const route_icon_mid = L.divIcon({className: "route_icon_mid"})
const route_icon_end = L.divIcon({className: "route_icon_end"})

window.is_building_route = true
window.route_nodes = []

function route_building_add_point(point) {
	total_nodes = route_nodes.length
	if (total_nodes == 0) {
		route_nodes.push({
			'point': point,
			'marker': L.marker(point, {icon: route_icon_start}).addTo(map),
			'route': null,
		})
	} else {
		last_node = route_nodes[route_nodes.length - 1]
		if (total_nodes > 1 && !Array.isArray(last_node['route'])) {
			console.log('ignoring click until previous request is not finished')
		} else {
			var node = {
				'point': point,
				'marker': L.marker(point, {icon: route_icon_end}).addTo(map),
			}
			get_route_between_points(
				last_node['point'], point,
				on_success = function(route) {
					node['route'] = route
					node['point'] = route[route.length - 1]
					node['marker'].setLatLng(node['point'])
					if (route.length > 1) {
						node['polyline'] = L.polyline(route, {color: '#0A0', weight: 4}).addTo(map)
					}
					console.log('success: ' + route.length + ' new points added')
				},
				on_error = function(error_code, error_message) {
					map.removeLayer(node['marker'])
					route_nodes.pop()
					if (route_nodes.length > 1) {
						last_node = route_nodes[route_nodes.length - 1]
						map.removeLayer(last_node['marker'])
						last_node['marker'] = L.marker(last_node['point'], {icon: route_icon_end}).addTo(map)
					}
					console.log('error ' + error_code + ': ' + error_message)
				}
			)
			node['route'] = request
			route_nodes.push(node)
			if (route_nodes.length > 2) {
				prev_last_node = route_nodes[route_nodes.length - 2]
				map.removeLayer(prev_last_node['marker'])
				prev_last_node['marker'] = L.marker(prev_last_node['point'], {icon: route_icon_mid}).addTo(map)
			}
		}
	}
}

function get_route_between_points(point1, point2, on_success, on_error) {
	var lat1 = point1[0]
	var lng1 = point1[1]
	var lat2 = point2[0]
	var lng2 = point2[1]
	request_url = `http://localhost:8080/ors/v2/directions/driving-car?start=${lng1},${lat1}&end=${lng2},${lat2}`
	console.log('AJAX: requesting ' + request_url)
	request = $.ajax({
		url: request_url,
		dataType: 'json',
		timeout: 10000,
		success: function (response) {
			var route = response['features'][0]['geometry']['coordinates']
			for (var i = 0; i < route.length; i++) {
				route[i] = [route[i][1], route[i][0]]
			}
			on_success(route)
		},
		error: function (response) {
			if (response['responseJSON'] === undefined) {
				error_code = 0
				error_message = response.statusText
			} else {
				error_code = response['responseJSON']['error']['code']
				error_message = response['responseJSON']['error']['message']
			}
			on_error(error_code, error_message)
		},
	})
}

window.onload = function() {
	window.map = L.map('mapid').setView([54.913, 83.149], 12);
	L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
	}).addTo(map);
	var roads = {
		'/road1.json': {color: '#CC9900', weight: 6, dashArray: 10},
		'/road2.json': {color: '#800000', weight: 4},
		'/road3.json': {color: '#006600', weight: 6}
	}
	Object.keys(roads).forEach(function (filename) {
		var options = roads[filename]
		$.getJSON(filename, function(data) {
		    var latlngs = data['latlng']
			var polyline = L.polyline(latlngs, options).addTo(map);
		});
	})
	map.on('click', function(e) {
		if (is_building_route) {
			route_building_add_point([e.latlng.lat, e.latlng.lng])
		}
    });
}