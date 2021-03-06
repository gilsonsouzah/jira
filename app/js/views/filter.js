'use strict';

var FilterView = Backbone.View.extend({
	className: 'tab-pane',
	getKeyByNode: function(node) {
		return $(node).parents('[jira-key]').attr('jira-key');
	},
	events: {
		// 'click .comment-issue': function(evt) {
		// 	new IssueEditView({
		// 		options: {
		// 				title: 'Post Comment',
		// 				button: 'Post Comment',
		// 				fields: {
		// 					log: false,
		// 					comment: true,
		// 					resolution: false,
		// 					assignee: false
		// 				}
		// 		},
		// 		model: this.model.issues.findWhere({
		// 			'key': this.getKeyByNode(evt.target)
		// 		})
		// 	});
		// },
		// 'click .resolve-issue': function(evt) {
		// 	new IssueEditView({
		// 		options: {
		// 				title: 'Resolve Issue',
		// 				button: 'Resolve',
		// 				resolution: 1,
		// 				fields: {
		// 					log: false,
		// 					comment: true,
		// 					resolution: true,
		// 					assignee: false
		// 				}
		// 		},
		// 		model: this.model.issues.findWhere({
		// 			'key': this.getKeyByNode(evt.target)
		// 		})
		// 	});
		// },
		// 'click .assign-issue': function(evt) {
		// 	new IssueEditView({
		// 		options: {
		// 				title: 'Change Assignee',
		// 				button: 'Assign',
		// 				fields: {
		// 					log: false,
		// 					comment: true,
		// 					resolution: false,
		// 					assignee: true
		// 				}
		// 		},
		// 		model: this.model.issues.findWhere({
		// 			'key': this.getKeyByNode(evt.target)
		// 		})
		// 	});
		// },
		// 'click .log-issue': function(evt) {
		// 	new IssueEditView({
		// 		options: {
		// 			title: 'Log Issue',
		// 			button: 'Log Work',
		// 			fields: {
		// 				log: true,
		// 				comment: true,
		// 				resolution: true,
		// 				assignee: true
		// 			}
		// 		},
		// 		model: this.model.issues.findWhere({
		// 			'key': this.getKeyByNode(evt.target)
		// 		})
		// 	});
		// },
		// 'click .start-progress': function(evt) {
		// 	this.model.issues.findWhere({
		// 		'key': this.getKeyByNode(evt.target)
		// 	}).progress(true);
		// },
		// 'click .stop-progress': function(evt) {
		// 	this.model.issues.findWhere({
		// 		'key': this.getKeyByNode(evt.target)
		// 	}).progress(false);
		// },

	},
	initialize: function() {
		this.$el.attr('id', 'tab-filter-' + this.model['cid']).appendTo('.tab-content');
		this.listenToOnce(this.model.issues, {
			'sync': this.render,
			'error': this.renderError,
			'request': this.renderLoader,
		});
		this.listenTo(this.model, {
			'remove': this.remove
		});
		this.model.issues.fetch();
	},
	renderError: function(collection, xhr, options) {
		console.log('renderError' , arguments);
		this.$el.html(templates.errorMessage({
			message: xhr.responseText
		}));
	},
	renderLoader: function() {
		console.log('render loader');
		this.$el.html(templates.loader());
	},
	render: function() {
		console.log('render tasks');
		var $tbody = this.$el.html(templates.issuesTable()).find('tbody');
		this.model.issues.each(function(issue) {
			$tbody.append(new IssueView({model: issue}).render());
		});
		return this.$el;
	},
});


var FilterEditView = Backbone.View.extend({
	'events': {
		'hidden.bs.modal': function() {
			this.remove();
		},
		'click .filter-save': 'save',
		'click .filter-create': 'create',
		'change #favouriteFilters': function(evt) {
			var node = evt.target.options[evt.target.selectedIndex];
			if (node.getAttribute('data-jql')) {
				this.$el.find('#filterName').val(node.getAttribute('data-name'));
				this.$el.find('#filterJQL').val(node.getAttribute('data-jql'));
			}
		}
	},
	render: function() {
		var this_ = this;
		this_.setElement(
			$(templates.dlgEditFilter({
				filter: this_.model ? this_.model.toJSON() : null,
				favouriteFilters: app.server.favoriteFilters.toJSON(),
			})).appendTo('body')
		);
		this.$el.modal('show');
		return this.$el;
	},
	getValues: function() {
		return {
			'name': this.$el.find('#filterName').val(),
			'jql': this.$el.find('#filterJQL').val(),
			'type': parseInt(this.$el.find('#filterType').val())
		};
	},
	save: function() {
		var attributes = this.getValues();
		if (this.model) {
			this.model.set(attributes);
		} else {
			app.server.filters.add(attributes);
		}
    app.server.filters.save();
	},
	create: function() {
		var attributes = this.getValues();
		app.server.filters.add(attributes);
	}
});
