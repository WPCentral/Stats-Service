// set variables for environment
var express = require('express'),
	app     = express(),
	mysql   = require('mysql');
	request = require('request');

// Set server port
app.listen(4001);
console.log('server is running');

var pool = mysql.createPool({
	connectionLimit : 10,
	host     : 'localhost',
	user     : 'checksums',
	password : 'password',
	database : 'checksums'
});

pool.on('enqueue', function () {
	log_error('Waiting for available connection slot');
});

app.get( '/count/:version', function(req, res) {
	pool.getConnection(function(err, connection) {
		var sql     = "SELECT * FROM downloads WHERE version = ? ORDER BY count DESC LIMIT 1";
		var inserts = [ req.params.version ];
		sql         = mysql.format(sql, inserts);

		connection.query( sql, function(err, rows, fields) {
			if ( ! err && rows.length > 0 ) {
				res.json(rows[0]);
			}
			else {
				res.json({
					'count': 0
				});
			}

			connection.release();
		});
	});
});

app.get( '/count-history/:version', function(req, res) {
	pool.getConnection(function(err, connection) {
		var sql     = "SELECT MAX(count) as count, date_format(date_gmt,'%Y-%m-%d') as date FROM downloads WHERE version = ? GROUP BY YEAR(date_gmt), MONTH(date_gmt), DATE(date_gmt) ORDER BY date_gmt";
		var inserts = [ req.params.version ];
		sql         = mysql.format(sql, inserts);

		connection.query( sql, function(err, rows, fields) {
			if ( ! err ) {
				res.json(cache);
			}
			else {
				res.json({});
			}

			connection.release();
		});
	});
});

app.get( '/count-stats/:version', function(req, res) {
	pool.getConnection(function(err, connection) {
		var sql     = "SELECT ( MAX(count) - MIN(count) ) as downloads, WEEKDAY( date_gmt ) as weekday, HOUR( date_gmt ) as hour FROM downloads WHERE version = ? GROUP BY YEAR(date_gmt), MONTH(date_gmt), DATE(date_gmt), HOUR(date_gmt)";
		var inserts = [ req.params.version ];
		sql         = mysql.format(sql, inserts);

		connection.query( sql, function(err, rows, fields) {
			if ( ! err ) {
				var data = {
					'days':  [ 0, 0, 0, 0, 0, 0, 0 ],
					'hours': [ 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 ]
				}

				for (var row_id in rows) {
					var row = rows[ row_id ];

					data.days[ row.weekday ] = data.days[ row.weekday ] + row.downloads;
					data.hours[ row.hour ]   = data.hours[ row.hour ] + row.downloads;
				}

				res.json(data);
			}
			else {
				res.json({});
			}

			connection.release();
		});
	});
});

app.get( '/last-7days/:version', function(req, res) {
	pool.getConnection(function(err, connection) {
		var sql     = "SELECT ( MAX(count) - MIN(count) ) as downloads, WEEKDAY( date_gmt ) as weekday FROM downloads WHERE version = ? GROUP BY YEAR(date_gmt), MONTH(date_gmt), DATE(date_gmt) ORDER BY date_gmt DESC LIMIT 7";
		var inserts = [ req.params.version ];
		sql         = mysql.format(sql, inserts);

		connection.query( sql, function(err, rows, fields) {
			if ( ! err ) {
				res.json(rows);
			}
			else {
				res.json({});
			}

			connection.release();
		});
	});
});

app.get( '/versions', function(req, res) {
	pool.getConnection(function(err, connection) {
		var sql     = "SELECT DISTINCT version FROM downloads";

		connection.query( sql, function(err, rows, fields) {
			if ( ! err ) {
				res.json(rows);
			}
			else {
				res.json({});
			}

			connection.release();
		});
	});
});

app.use(function(req, res, next) {
	res.status(404).json({
		'error': "Route doesn;'t exist"
	});
});