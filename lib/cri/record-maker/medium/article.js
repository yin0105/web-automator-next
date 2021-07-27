const MediumRecordMaker = require('../medium');
const Wikipedia = require('../../../wikipedia');

class ArticleRecordMaker extends MediumRecordMaker {
  constructor(cridb) {
    super({ cridb, subtype: 'article' });
  }

  async createForThing({ tags = [], id: thingID, ...rest }) {
    tags = [
      ...tags,
      {
        type: 'thing',
        id: thingID,
      },
    ];
    return await this.create({ tags, ...rest });
  }

  async create({ tags = [], status = 'pending', name: articleName, ...rest }) {
    if (!articleName) [articleName] = arguments;
    const { subtype } = this;
    const [{ dom }, mediumID, realname] = await Promise.all([
      Wikipedia.getRender(articleName),
      this.getRecordID(articleName),
      rest.realname || this.getRealName(articleName),
    ]);
    const content = this.getContent({ dom, name: articleName });
    const tagsOnDB = await this.getRecordTags(mediumID);
    const requestData = {
      status,
      content,
      subtype,
      tags: [...tags, ...tagsOnDB],
      name: realname,
      nickname: `wkpd-${articleName}`,
    };

    return {
      articleID: await this.cridb.saveMedium({
        id: mediumID,
        data: requestData,
      }),
    };
  }

  getContent({ dom, name }) {
    [
      ...[
        'infobox',
        'mbox',
        'wikitable collapsible',
        'navbox',
      ].map((keyword) => ['table', 'class', keyword]),

      ...['thumb', 'hatnote', 'shortdescription'].map((keyword) => [
        'div',
        'class',
        keyword,
      ]),

      ['sup'],
      ['small'],
      ['img'],

      ['span', 'style', 'font-size: small'],
      ['div', 'id', 'toc'],
      ['p', 'class', 'mw-empty-elt'],
    ].forEach(([tagName, attrName, attrKeyword]) => {
      dom.querySelectorAll(tagName).forEach((element) => {
        if (
          !attrName ||
          !attrKeyword ||
          (element.getAttribute(attrName) || '').includes(attrKeyword)
        ) {
          element.parentNode.removeChild(element);
        }
      });
    });

    const html =
      (dom.querySelector('body') || dom)
        .toString()
        .trim()
        .replace(/^<body>/, '')
        .replace(/<\/body>$/, '')
        .replace(/&nbsp;listen&nbsp;/g, '')
        .replace(/&nbsp;listen&nbsp;/g, '')
        .replace(
          /<h2>\s*(See also|Gallery|References|External links|Notes|Image gallery|References and literature|Media gallery)\s*<\/h2>.*/s,
          '',
        ) + `<p>Source: https://en.wikipedia.org/wiki/${name}</p>`;

    return html.trim();
  }
}

module.exports = ArticleRecordMaker;
