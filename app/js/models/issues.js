
//-------------------------------------------------------
//-- Models

var IssueModel = Backbone.Model.extend({
	idAttribute: 'key',
	url: function() {
		return this.get('self');
	},
	fields: ['project', 'assignee', 'reporter', 'issuetype', 'priority', 'progress', 'status'],
	constructor: function() {
		var this_ = this;
		_.each(this.fields, function(field) {
			this_[field] = new Backbone.Model();
			this_[field].on('change', function() {
				this_.trigger('change:' + field, this_, this_[field].toJSON());
			});
		});
		return Backbone.Model.prototype.constructor.apply(this, arguments);
	},
	initialize: function(issue) {
		var this_ = this;

		chrome.storage.local.get(issue['key'], function(storedAttributes) {
			if (storedAttributes) {
				this_.set(storedAttributes);
			}
		});

		this.on({
			'change:status': this.getTransitions,
			'all': function(event, task, attr) {
				if (event.indexOf('change:') === 0) {
					console.log(arguments);
					var type;
					switch (event) {
						case 'change:reporter': type = 'Reporter'; break;
						case 'change:assignee': type = 'Assignee'; break;
						case 'change:status': type = 'Status'; break;
						case 'change:issuetype': type = 'Type'; break;
					}
					if (type) {
						var notification = new Notification(task.get('key'), {
							icon: attr.avatarUrls ? attr.avatarUrls['48x48'] : attr.iconUrl,
							body: task.get('summary') + '\n' + 
								type + ': '+ (attr.displayName ? attr.displayName : attr.name)
						});
						notification.onclick = function() {
							chrome.tabs.create({
								url: task.get('url')
							})
						};
					}
				}
			}
		});

		this.getTransitions();

		// this.on({
		// 	'change:duedate': function(e) {

		// 	},
		// 	'change:estiamte': function(e) {
		// 		app.server.api.updateIssue(this.get('self'), {
		// 			'timetracking': {
		// 				'originalEstimateSeconds': (e.end - e.start)/1000
		// 			}
		// 		}, function(issue) {
		// 			this_.set({
		// 				'estimate': parseInt(issue.fields['timetracking']['originalEstimateSeconds'])
		// 			});
		// 		});
		// 	}
		// });
	},
	parse: function(issue) {
		var this_ = this;
		_.each(this.fields, function(field) {
			if (issue.fields[field]) {
				this_[field].set(issue.fields[field]);
			}
		});
		return {
			'key': issue['key'],
			'self': issue['self'],
			'duedate': issue.fields['duedate'] ? new Date(issue.fields['duedate']) : null,
			'estimate': parseInt(issue.fields['timetracking'] ? issue.fields['timetracking']['originalEstimateSeconds'] : 0),
			'fixVersions': _.map(issue.fields['fixVersions'], function(version) {
				return {
					'name': version['name'],
					'description': version['description'],
					'url': app.server.get('url') + 'browse/' + issue.fields['project']['key'] + '/fixforversion/' + version['id']
				}
			}),
			'summary': issue.fields['summary'],
			'url': issue['self'].replace(/\/rest\/api\/2\/issue\/.*/, '/browse/' + issue['key'])
		};
	},
	changeDuedate: function(even) {
		// app.server.api.updateIssue(this.get('self'), {
		// 	'duedate': moment(even.start).format('YYYY-MM-DD')
		// }, function(issue) {
		// 	this_.set({
		// 		'duedate': new Date(issue.fields['duedate'])
		// 	});
		// });
	},
	changeEstimate: function(event) {
		// app.server.api.updateIssue(this.get('self'), {
		// 	'timetracking': {
		// 		'originalEstimateSeconds': (event.end - event.start)/1000
		// 	}
		// }, function(issue) {
		// 	this_.set({
		// 		'estimate': parseInt(issue.fields['timetracking']['originalEstimateSeconds'])
		// 	});
		// });
	},
	progress: function(started) {
		if (started) {
			this.set({'started': new Date()});
			var obj = {};
			obj[this.get('key')] = {
				'started': new Date()
			};
			chrome.storage.local.set(obj);
		} else {
			this.unset('started');
			chrome.storage.local.remove(this.get('key'));
		}
		this_.collection.filter.trigger('updated');
	},
	assign: function(username) {
		// var this_ = this;
		// app.server.api.assign(this.get('self'), username, function(issue) {
		// 	this_.set({
		// 		'assignee': issue.fields['assignee']
		// 	});
		// });
	},
	worklog: function(data) {
		// app.server.api.worklog(this.get('self'), data);
	},
	comment: function(data) {
		return $.ajax({
			url: this.collection.server.get('url') + '/comment', 
			type: 'POST',
			contentType: 'application/json', 
			data: JSON.stringify({
				'body': data
			}), 
			'success': function(data){ callback && callback(data); } 
		});
	},
	resolve: function(resolution) {
		// var this_ = this;
		// app.server.api.resolve(this.get('self'), resolution, function() {
		// 	this_.collection.filter.update();
		// });
	},
	getAssignableUsers: function(callback) {
		return $.ajax({
			url: this.collection.server.get('url') + '/rest/api/2/user/assignable/search',
			data: {
				issueKey: this.id
			},
			type: 'GET',
			contentType: 'application/json',
			success: function(data) {
				console.log(data);
				this_.assignableUsers = data;
			}
		});
	},
	getTransitions: function() {
		var this_ = this;
		return $.ajax({
			url: this.get('self') + '/transitions',
			success: function(data) {
				this_.set({
					transitions: data.transitions
				});
			}
		});
	},
	toJSON: function() {
		var this_ = this;
		return _.reduce(this.fields, function(res, field) {
				res[field] = this_[field].toJSON();
				return res;
		}, _.extend(Backbone.Model.prototype.toJSON.apply(this, arguments), {
			estimate: this.get('estimate') ? moment.duration(this.get('estimate'), 's').humanize() : '',
			duedate: this.get('duedate') ? moment(this.get('duedate')).format('l') : ''
		}));
	},
	post: function(url, data) {
		return $.ajax({
			url: this.get('self') + url,
			method: 'POST',
			contentType: 'application/json',
			processData: false,
			dataType: 'json',
			data: JSON.stringify(data)
		});
	},
	transition: function(data) {
		var this_ = this;
		return this.post('/transitions', {
			transition: data
		}).complete(function() {
			this_.fetch();
		});
	}
});

var IssuesCollection = Backbone.Collection.extend({
	model: IssueModel,
	filter: null,
	server: null,
	timeout: null,
	UPDATE_INTERVAL: 1 * 60000, 
	url: function() {
		return this.server.get('url') + '/rest/api/2/search';
	},
	initialize: function(models, options) {
		_.extendOwn(this, options);
		var this_ = this;

		this.listenTo(this.filter, 'change:jql', function() {
      this.fetch()
    });
		this.once({
			'sync': function() {
				this.on('add', function(task) {
					var notification = new Notification(task.get('key'), {
						icon: task.project.get('avatarUrls')['48x48'],
						body: task.get('summary')
					});
					notification.onclick = function() {
						chrome.tabs.create({
							url: task.get('url')
						})
					};
				});
			}
		});
		this.on({
			'sync': function(collection) {
				this.filter.trigger('issues-sync', collection);
			},
			'error remove': function(collection) {
				window.clearInterval(this.timeout);
			}
		});			
		
		this.fetch();
	},
	parse: function(data) {
		return data.issues;
	},
	update: function(opt_options) {
		var options = opt_options || {data: {}};
		_.defaults(options.data, {
			jql: this.filter.get('jql'),
			fields: 'id,key,summary,duedate,priority,status,assignee'
		});
		return Backbone.Collection.prototype.fetch.call(this, options);
	},
	fetch: function(opt_options) {
		var options = opt_options || {data: {}};
		
		var this_ = this;
		window.clearInterval(this.timeout);
		this.timeout = window.setInterval(function() {
			this_.update();
		}, this.UPDATE_INTERVAL);
		_.defaults(options.data, {
			jql: this.filter.get('jql'),
			fields: 'id,key,summary,timetracking,duedate,fixVersions,issuetype,reporter,priority,status,assignee,progress,project'
		});
		return Backbone.Collection.prototype.fetch.call(this, options);
	}
});
