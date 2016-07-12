'use strict'

let _ = require('lodash');

let descriptions = require('iris-error-codes');
const unknown_error = {
	en: 'Unknown_error',
	ru: 'Неизвестная ошибка'
};


class Errors {
	constructor() {
		throw new Error('singletone');
	}
	static getByCode(section, error_code) {
		let translations = _.get(descriptions, [section, error_code]);

		return translations || unknown_error;
	}
}

module.exports = Errors;
