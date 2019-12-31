var script = function(vk, Args) {
	var dataset = [];
	var first_time = true;
	var start_time;
	var end_time;
	var user_id;

	var words = [];
	if (Args.dictionary) {
		words = Args.dictionary;
	} else {
		words = ['хуй', 'хуи', 'блядь', 'блять', 'блядб', 'блятб', ' бля', 'охуе', 'ахуе', 'пидор'];
	}

	var start_id, end_id, current_id;

	Script.execution.showProgressBar();

	function update_progress_bar(start, end, current) {
		let percentage = 100 - (100 * (end - current) / (end - start));
		Script.execution.setProgress(percentage);
	}

	function visualize() {
		let processed_dataset = [['Date', 'Count']];
		let time = start_time;

		Script.execution.hideProgressBar();
		
		for (let i = 0; i < dataset.length; i++) {
			let date = new Date(time*1000);
			let day = date.getDate();
			if (day < 10) day = '0' + day;
			let month = date.getMonth();
			if (month < 10) month = '0' + month;
			let year = date.getFullYear();
			processed_dataset.push([day + '.' + month + '.' + year, dataset[i]]);
			time += Args.time_unit;
		}
		
		var options = {
			title: 'Количество бранных слов',
			curveType: 'function',
			legend: 'none',
			hAxis: {slantedText:true, slantedTextAngle:90},
			vAxis: {title: 'Количество'}
		}

		Script.result.lineChart(processed_dataset, options);
	}

	function init_dataset(start_time, end_time) {
		time = start_time;
		while (time <= end_time) {
			dataset.push(0);
			time += Args.time_unit;
		}
	}

	function onResponseGet(r) {
		if (first_time) {
			if (r.response.items[0]) {
				start_id = r.response.items[0].id
				start_time = r.response.items[0].date;
				init_dataset(start_time, end_time);
				first_time = false;
			}
		}
		
		for (let i = 0; i < r.response.items.length; i++) {
			let part_index = Math.floor((r.response.items[i].date - start_time) / Args.time_unit);
			for (let j = 0; j < words.length; j++) {
				if (r.response.items[i].from_id == user_id) {
					if (r.response.items[i].text.toUpperCase().indexOf(words[j].toUpperCase()) !== -1) {
						dataset[part_index]++;
					}
				}
			}
		}
		update_progress_bar(start_id, end_id, r.response.items[r.response.items.length - 1].id);
		if (this == 1) {
			visualize();
		}
	}

	async function main() {
		var last_message_id;
		if (Args.end_id == 0) {
			last_message_id = await new Promise(function(resolve, fail) {
				vk._api("messages.getDialogs", {count:1}, r => {
					end_time = r.response.items[0].message.date;
					resolve(r.response.items[0].message.id);
				});
			});
		} else {
			last_message_id = Args.end_id;
		}
		if (Args.user_id == 0) {
			user_id = await new Promise(function(resolve, fail) {
				vk._api("users.get", {}, r => {
					resolve(r.response[0].id);
				});
			})
		} else {
			user_id = Args.user_id;
		}
		
		end_id = last_message_id;
		let current_message_id = parseInt(Args.start_id ? Args.start_id : 0);
		let last = 0;
		while (current_message_id < last_message_id) {
			let ids_to_get = "";
			for (let i = 0; i < 100; i++) {
				ids_to_get += (current_message_id + i) + (i + 1 == 100 ? '' : ',');
				if (i + current_message_id == last_message_id) last = 1;
			}
			vk.api.messages.getById({message_ids:ids_to_get}, onResponseGet.bind(last));
			current_message_id += 100;
		}
		
	}

	main();
}