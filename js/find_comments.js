var script = function(vk, Args) {
	var subscriptions = [];
	var friends = [];
	var state = [];
	var subject = {};
	vk.default_version = "5.84";

	async function lookCommentsThrough(owner_id, post_id, offset=0) {
		Script.execution.setCurrentStatus("Просматриваем комментарии…");
		vk._api("wall.getComments", {
			owner_id: owner_id,
			post_id: post_id,
			count: 100,
			offset: offset
		}, r => {
			for (let i = 0; i < r.response.items.length; i++) {
				if (r.response.items[i].from_id == Args.user_id) {
					console.log(owner_id + " " + post_id);
					let d = new Date(r.response.items[i].date*1000);
					$('#foundContainer').append(`
						<li class="list-group-item">
							<div class="vk-comment-head">
								<img src="`+subject.photo_max+`" class="ava-small">
								<span class="vk-comment-name">`+subject.first_name+' '+subject.last_name+`</span>
								<span class="vk-comment-additional-info text-secondary">
									`+d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear()+` к записи
								<a href="https://vk.com/wall`+owner_id+'_'+post_id+'?reply='+r.response.items[i].id+`">
									https://vk.com/wall`+owner_id+'_'+post_id+`
								</a>
								</span>
							</div>
							`+r.response.items[i].text+
							 ''+((r.response.items[i].attachments!==undefined)?' [Вложения]':'')+`
						</li>
					`);
				}
			}
			if (offset + r.response.items.length < r.response.count) {
				lookCommentsThrough(owner_id, post_id, offset + 100);
			}
		});
	}

	async function main() {
		Script.execution.showStatus();
		Script.execution.hideNothingHereBox();

		if (Args.user_id == 0) {
			Args.user_id = await new Promise(function(resolve, fail) {
				vk._api("users.get", {}, r => {
					resolve(r.response[0].id);
				});
			});
		}

		Script.execution.setCurrentStatus("Получаем данные о подопытном…");
		subject = await new Promise(function(resolve, fail) {
			vk._api("users.get", {
				user_ids: Args.user_id,
				fields: "photo_max"
			}, r => {
				resolve(r.response[0]);
			});
		});


		if (Args.alsoCheck.length > 0) {
			Script.execution.setCurrentStatus("Получаем данные о пользователях и сообществах…");
			let communities = [];
			let users = [];
			for (let i = 0; i < Args.alsoCheck.length; i++) {
				if (Args.alsoCheck[i] > 0) {
					users.push(Args.alsoCheck[i]);
				} else {
					communities.push(Args.alsoCheck[i]);
				}
			}

			if (communities.length > 0) {
				let needed_communities = "";
				for (let i = 0; i < communities.length; i++) {
					needed_communities += -communities[i] + (i + 1 == communities.length ? "":",");
				}
				communities = await new Promise(function(resolve, fail) {
					vk._api("groups.getById", {
						group_ids: needed_communities,
						fields: "photo_max"
					}, r => {
						resolve(r.response);
					});
				});
				for (let i = 0; i < communities.length; i++) {
					state.push({
						id: -communities[i].id,
						name: communities[i].name,
						photo: communities[i].photo_max,
						posts_count: 1,
						posts_left: 1,
						offset: 0
					});
				}
			}

			if (users.length > 0) {
				let needed_users = "";
				for (let i = 0; i < users.length; i++) {
					needed_users += users[i] + (i + 1 == users.length ? "":",");
				}
				users = await new Promise(function(resolve, fail) {
					vk._api("users.get", {
						user_ids: needed_users,
						fields: "photo_max"
					}, r => {
						resolve(r.response);
					});
				});
				for (let i = 0; i < users.length; i++) {
					state.push({
						id: users[i].id,
						name: users[i].name,
						photo: users[i].photo_max,
						posts_count: 1,
						posts_left: 1,
						offset: 0
					});
				}
			}			
		}
		if (Args.checkFriends) {
			Script.execution.setCurrentStatus("Получаем данные о друзьях…");
			friends = await new Promise(function(resolve, fail) {
				vk._api("friends.get", {
					user_id: Args.user_id,
					fields: "photo_max"
				}, r => {
					resolve(r.response.items);
				});
			});
			for (let i = 0; i < friends.length; i++) {
				state.push({
					id: friends[i].id,
					name: friends[i].first_name + " " + friends[i].last_name,
					photo: friends[i].photo_max,
					posts_count: 1,
					posts_left: 1,
					offset: 0
				});
			}
		}
		if (Args.checkCommunities) {
			Script.execution.setCurrentStatus("Получаем данные о подписках…");
			subscriptions = await new Promise(function(resolve, fail) {
				vk._api("users.getSubscriptions", {
					user_id: Args.user_id, 
					count: 200, 
					extended: 1, 
					fields: "photo_max"
				}, r => {
					resolve(r.response.items);
				});
			});
			for (let i = 0; i < subscriptions.length; i++) {
				state.push({
					id: -subscriptions[i].id,
					name: subscriptions[i].name,
					photo: subscriptions[i].photo_max,
					posts_count: 1,
					posts_left: 1,
					offset: 0
				});
			}
		}

		Script.execution.setCurrentStatus("Получаем данные о постах…");
		for (let i = 0; i < state.length; i++) {
			count = await new Promise(function(resolve, fail) {
				vk._api("wall.get", {owner_id: state[i].id, count: 1}, (r, e) => {
					if (r.error) {
						resolve(-1);
					} else {
						resolve(r.response.count);
					}
				});
			});
			state[i].posts_count = count;
			state[i].posts_left = count;
			if (count == -1) {
				state.splice(i, 1);
				i--;
			}
		}

		$('#statusContainer').before(`
			<div class="card" style="margin-bottom: 20px">
				<ul id="foundContainer" class="list-group list-group-flush"></ul>
			</div>
		`);
		Script.execution.setCurrentStatus("Получаем посты…");
		let counter = 0;
		let cont = true;
		while (cont) {
			if (state[counter].posts_left > 0) {
				vk._api("wall.get", {
					count: 200,
					owner_id: state[counter].id,
					offset: state[counter].offset
				}, r => {
					for (let i = 0; i < r.response.items.length; i++) {
						if (r.response.items[i].comments.count > 0) {
							lookCommentsThrough(r.response.items[i].owner_id, r.response.items[i].id);
						}
					}
				});
				console.log(state);
				state[counter].posts_left -= 200;
				state[counter].offset += 200;
			}

			cont = false;
			for (let i = 0; i < state.length; i++) {
				if (state[i].posts_left > 0) {
					cont = true;
				}
			}
			counter++;
			if (counter >= state.length) {
				counter = 0;
			}
		}
	}

	main();
}