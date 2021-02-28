
var Script = {
	execution: {
		showProgressBar: () => {
			$('#progressContainer').addClass('d-block');
			Script.execution.hideNothingHereBox();
		},
		hideProgressBar: () => {
			$('#progressContainer').removeClass('d-block');
		},
		hideNothingHereBox: () => {
			$('#nothingHereBox').addClass('d-none');
		},
		setProgress: percentage => {
			$('#progressBar').width(percentage + '%');  
			$('#progressBar').text(Math.round(percentage) + '%');
		},
		setCurrentStatus: status => {
			$('#statusText').text(status);
		},
		showStatus: () => {
			$('#statusContainer').addClass('d-block');
		},
		hideStatus: () => {
			$('#statusContainer').removeClass('d-block');	
		},
		showSpinner: () => {
			$('#statusSpinner').removeClass('d-none');
		},
		hideSpinner: () => {
			$('#statusSpinner').addClass('d-none');
		}
	},
	result: {
		dataset: [],
		graph: 0,
		setDataset: dataset => {
			Script.result.dataset = dataset;
		},
		lineChart: (data, options) => {
			Script.result.showResultBlock();
			Script.result.showDownloadButton();
			Script.execution.hideProgressBar();
			let dataset = google.visualization.arrayToDataTable(data);
			Script.result.setDataset(data);
			var chart = new google.visualization.LineChart($('#resultContainer')[0]);
			chart.draw(dataset, options);
			Script.result.graph = chart;
		},
		showResultBlock: () => {
			$('#resultContainer').removeClass('d-none');
			onResize();
		},
		addResultHTML: code => {
			$('#executionResult').append(code);
		},
		showDownloadButton: () => {
			$('#downloadButtonContainer').removeClass('d-none')
		}
	}
}

var Tokens = {
	permissions: {
		notify: [1, 0, 'уведомления'],
		friends: [2, 1, 'друзья'],
		photos: [4, 2, 'фото'],
		audio: [8, 3, 'аудио'],
		video: [16, 4, 'видео'],
		stories: [64, 6, 'истории'],
		pages: [128, 7, 'wiki-страницы'],
		add_to_left_menu: [256, 8, 'добавление в левое меню'],
		status: [1024, 10, 'статус'],
		notes: [2048, 11, 'заметки'],
		messages: [4096, 12, 'сообщения'],
		wall: [8192, 13, 'стена'],
		ads: [32768, 15, 'реклама'],
		offline: [65536, 16, 'доступ в любое время'],
		docs: [131072, 17, 'документы'],
		groups: [262144, 18, 'группы'],
		notifications: [524288, 19, 'уведомления'],
		stats: [1048576, 20, 'статистика'],
		email: [4194304, 22, 'e-mail'],
		market: [134217728, 27, 'товары']
	},
	get: () => {
		let count = Tokens.getCount();
		let result = [];
		for (let i = 0; i < count; i++) {
			let token = localStorage.getItem('access_token_' + i);
			if (token) {
				result.push(token);
			}
		}
		return result;
	},
	getCount: () => {
		let count = localStorage.getItem('tokens_count');
		if (!count) {
			count = 0;
			localStorage.setItem('tokens_count', 0);
		}
		return count;
	},
	add: token => {
		let count = Tokens.getCount();
		for (let i = 0; i < count; i++) {
		 	if (localStorage.getItem('access_token_' + i) == token) {
		 		return;
		 	}
		}
		for (let i = 0; i < count + 1; i++) {
			if (!localStorage.getItem('access_token_' + i)) {
				localStorage.setItem('access_token_' + i, token);
				localStorage.setItem('tokens_count', count + 1); 
				return;
			}
		}
		Token.getScope(token);
		Token.getData(token);
	},
	remove: item => {
		let count = Tokens.getCount();
		if (typeof item == 'number') {
			localStorage.removeItem('access_token_' + item);
		} else if (typeof (''+item) == 'string') {
			for (let i = 0; i < count; i++) {
				if (localStorage.getItem('access_token_' + i) == item) {
					localStorage.removeItem('access_token_' + i);
				}
			}
		}
	},
	removeBlankSpaces: () => {
		let count = Tokens.getCount();
		let tokens = [];
		for (let i = 0; i < count; i++) {
			let item = localStorage.getItem('access_token_' + i);
			if (item) {
				tokens.push(item);
			}
		}
		Tokens.clear();
		for (let i = 0; i < tokens.length; i++) {
			localStorage.setItem('access_token_' + i, tokens[i]);
		}
		localStorage.setItem('tokens_count', tokens.length);
	},
	clear: () => {
		let tokens = Tokens.get();
		for (token in tokens) {
			Tokens.remove(token);
		}
	},
	parseLink: (link, callback) => {
		if (link.length == 85) {
			Tokens.add(link);
			return;
		}
		var queryString = link.substring( link.indexOf('#') + 1 );
		var params = {}, queries, temp, i, l;
		queries = queryString.split('&');
		for (let i = 0, l = queries.length; i < l; i++) {
			temp = queries[i].split('=');
			params[temp[0]] = temp[1];
		}
		if (params['access_token']) {
			Tokens.add(params['access_token']);
		}
	},
	getPermissions: scope => {
		let result = '';
		for (let permission in Tokens.permissions) {
			if ((scope & Tokens.permissions[permission][0]) == Tokens.permissions[permission][0]) {
				result += ((result.length > 0 ? ', ' : '') + Tokens.permissions[permission][2]);
			}
		}
		return result;
	},
	getScope: token => {
		let vk = module_vk(token);
		let data = localStorage.getItem(token + '_data');
		if (data) {
			if (JSON.parse(data).scope) {
				return new Promise((function(resolve, fail) {
					resolve(JSON.parse(this).scope);
				}).bind(data));
			}
		} else {
			return new Promise((function(resolve, fail) {
				vk._api('account.getAppPermissions', {}, (function(r) {
					let data = localStorage.getItem(this.token + '_data');
					if (data) {
						data = JSON.parse(data);
					} else {
						data = {};
					}
					data.scope = r.response;
					localStorage.setItem(this.token + '_data', JSON.stringify(data));
					resolve(r.response);
				}).bind(this));
			}).bind({
				token: token
			}));
		}
	},
	getData: token => {
		let vk = module_vk(token);
		let data = localStorage.getItem(token + '_data');
		if (JSON.parse(data).first_name) {
			return new Promise((function(resolve, fail) {
				resolve(JSON.parse(this));
			}).bind(data));
		} else {
			return new Promise((function(resolve, fail) {
				vk._api('users.get', {fields: 'photo_100'}, (function(r) {
					let data = localStorage.getItem(this.token + '_data');
					if (data) {
						data = JSON.parse(data);
					} else {
						data = {};
					}
					data.first_name = r.response[0].first_name;
					data.last_name = r.response[0].last_name;
					data.id = r.response[0].id;
					data.photo = r.response[0].photo_100;
					localStorage.setItem(this.token + '_data', JSON.stringify(data));
					resolve(data);
				}).bind(this));
			}).bind({
				token: token
			}));
		}	
	}
}

var Export = {
	excel: array => {
		let csvContent = '';
		array.forEach(rowItem => {
			rowItem.forEach(colItem => {
				csvContent += colItem + ',';
			});
			csvContent += '\r\n';
		});
		csvContent = 'data:application/csv,' + encodeURIComponent(csvContent);
		let link = $('#excelSaver');
		link.attr('href', csvContent); 
		link.attr('download', Export.getFileName() + '.csv');
		link.click();
	},
	image: graph => {
		let link = $('#imageSaver');
		link.attr('href', graph.getImageURI());
		link.attr('download', Export.getFileName() + '.png');
		link.click();
	},
	getFileName: () => {
		let date = new Date();
		return 'Poll-' + date.getDate() + '-' + date.getMonth() + '-' + date.getFullYear();
	}
}