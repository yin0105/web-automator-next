const moment = require('moment');

const cridbDateFormat = 'D/M/YYYY';
const dateFormatter = createDateFormatter();

function createDateFormatter(format = 'D MMM YYYY') {
  return (dateString) => {
    const date = moment(dateString, format);
    if (!date.isValid()) {
      throw TypeError('Invalid date: ' + JSON.stringify(dateString));
    }
    return date.format(cridbDateFormat);
  };
}

function prettierDate(date) {
  date = String(date);

  //replace 'ca.' tag
  date = date.replace(/ca?\s?\./g, '');

  //replace additional contents
  date = date.replace(/;.*/g, '');

  //replace thousands commas
  date = date.replace(/,(?=\d{3})/g, '');

  // replace weird text due to html parse bug
  date = date.replace(/\n+/g, '');
  date = date.replace(/Date/i, '');
  date = date.replace(/Location.+/gi, '');

  // replace weird dash to normal dash.
  date = date.replace(/–|—/, '-');

  // replace dash at end point
  date = date.replace(/-\s*$/, '');

  // replace suffix.
  date = date.replace(/BCE/, 'BC');
  date = date.replace(/CE/, 'AD');

  // remove useless additional explanation text
  date = date.replace(/\(.*\)/g, '');
  date = date.replace(/Some time after.+/gi, '');
  date = date.replace(/established?/gi, '');
  date = date.replace(/until/gi, '');
  date = date.replace(/\?/g, '');

  // replace useless strings
  date = date.replace(/\s+/g, ' ');
  date = date.replace(/\[[\w\s\d]+\]/g, '');

  // replace white space between dash
  date = date.replace(/\s*-\s*/, '-');

  // trim text
  date = date.trim();

  return date;
}

const dateReplacer = [
  {
    regexpList: [
      // case: "YYYY BC"
      // e.g.: "23BC"
      /^\d+\s?BC$/i,

      // case: "YYYY BC - YYYY BC"
      // e.g.: " 23BC - 3BC"
      /^\d{1,}\s?(BC|AD)\s?-\s?\d{1,}\s?(BC|AD)?$/i,

      // case: "before or after YYYY(-mm-DD)?"
      // e.g.: " before 1828"
      /(after|before)\s*\d+(-\d+){0,2}/i,
    ],
    replacer: (date) => date,
  },

  {
    regexpList: [
      // case: "YYYY - YYYY BC"
      // e.g.: '538 - 273 BC'
      /^\d+-\d+\s?BC/i,
    ],
    replacer(date) {
      return date
        .replace(/BC/gi, '')
        .split('-')
        .map((date) => `${date.trim()}BC`)
        .join('-');
    },
  },

  {
    regexpList: [
      // case: 'YYYY-mm-DD'
      /^\d+-\d+-\d+$/,
    ],
    replacer(date) {
      return moment(date, 'YYYY-mm-DD').format(cridbDateFormat);
    },
  },

  {
    regexpList: [
      // case: "YYYY-YYYY" or "YYYY"
      // e.g.: "2001-2020" or "2002"
      /^\d+-?(\d+)?\s?(AD)?$/i,

      // case: "mm YYYY - mm YYYY"
      // e.g.: "February 2011 - December 2012"
      /^\w+\s\d+-\w+\s\d+$/,
    ],
    replacer(date) {
      return date
        .replace(/-$/, '')
        .replace(/AD/i, '')
        .trim();
    },
  },

  {
    regexpList: [
      // case: "D MMM YYYY"
      // e.g.: "6 November 1975"
      /^\d{1,2}\s[a-z]+\s\d{1,4}$/i,
    ],
    replacer(date) {
      return dateFormatter(date);
    },
  },

  {
    regexpList: [
      // case: "DD MMM YYYY - DD MMM YYYY"
      // e.g.: "5 July 1941 - 31 January 1942"
      /^\d{1,2}\s[a-z]+\s\d{1,4}-\d{1,2}\s[a-z]+\s\d{1,4}$/i,
    ],
    replacer(date) {
      return date
        .split('-')
        .map(dateFormatter)
        .join('-');
    },
  },

  {
    regexpList: [
      // case: "DD-DD mm YYYY"
      // e.g.: "16–21 September 2014"
      /^\d{1,2}-\d{1,2}\s\w+\s\d+$/,
    ],
    replacer(date) {
      const [startDay, endDate] = date.split('-');
      const startDate = endDate.replace(/^\d+/, startDay);
      return [startDate, endDate].map(dateFormatter).join('-');
    },
  },

  {
    regexpList: [
      // case: "DD mm YYYY - mm DD, YYYY"
      // e.g.: "24 June 1821 - October 26, 1998"
      /^\d+\s[a-z]+\s\d+-[a-z]+\s\d+,\s\d+$/i,
    ],
    replacer(date) {
      let [startDate, endDate] = date.split('-');
      startDate = dateFormatter(startDate);
      endDate = endDate.replace(',', '');
      endDate = createDateFormatter('MMM DD YYYY')(endDate);
      return `${startDate}-${endDate}`;
    },
  },

  {
    regexpList: [
      // case: "mm-mm YYYY"
      // e.g.: "February-March 2000"
      /^[a-z]+-[a-z]+\s\d+$/i,
    ],
    replacer(date) {
      const [months, year] = date.split(' ');
      return months
        .split('-')
        .map((month) => `${month}/${year}`)
        .join('-');
    },
  },

  {
    regexpList: [
      // case: "DD mm - DD mm YYYY"
      // e.g.: "20 November - 4 December 1979"
      /^\d+\s\w+-\d+\s\w+\s\d+$/,
    ],
    replacer(date) {
      let [startDate, endDate] = date.split('-');
      const year = endDate.split(' ').pop();
      startDate = `${startDate} ${year}`;
      return [startDate, endDate].map(dateFormatter).join('-');
    },
  },

  {
    regexpList: [
      // case: "YYYY-YYYY/YYYY/YYY"
      // e.g.: "1555-1859/1874/1895"
      /^\d+-\d+(\/\d+)+$/,

      // case: "YYYY/YYYY"
      // e.g.: "1960/1963"
      /^\d+(\/\d+)+$/,
    ],
    replacer(date) {
      return date.replace(/\/.*/, '');
    },
  },
];

module.exports = function parseDate(date) {
  date = prettierDate(date);

  for (let n = 0; n < dateReplacer.length; n++) {
    const { regexpList, replacer } = dateReplacer[n];
    for (let m = 0; m < regexpList.length; m++) {
      const regexp = regexpList[m];
      if (regexp.test(date)) {
        return String(replacer(date)).trim();
      }
    }
  }

  throw TypeError('Unknow date format: ' + JSON.stringify(date));
};
