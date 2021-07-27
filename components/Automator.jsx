import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { parse as parseHTML, HTMLElement } from 'node-html-parser';
import { useDebounce } from 'use-debounce';
import { fromString as HTMLtoString } from 'html-to-text';
import * as geolib from 'geolib';
import fetch from 'node-fetch';

const recordTypeNames = {
  thing: ['person', 'place', 'artefact'],
  event: ['event', 'birth', 'death', 'start', 'end', 'reign', 'fl'],
  medium: ['article', 'audio', 'map', 'picture', 'subsection', 'video'],
};

const wikiCache = {};

export const fromWiki = {
  getTitle($) {
    return HTMLtoString($.querySelector('#firstHeading').innerHTML);
  },

  getCoordinate($) {
    const elements = $.querySelectorAll('table.infobox.vcard tr');

    function processCoord(lawText) {
      return geolib.toDecimal(lawText.trim());
    }

    for (const td of elements) {
      const innerText = HTMLtoString(td.innerHTML).trim();
      if (-1 < innerText.toLowerCase().indexOf('coordinates')) {
        return {
          longitude: processCoord(td.querySelector('.longitude').innerHTML),
          latitude: processCoord(td.querySelector('.latitude').innerHTML),
        };
      }
    }
  },

  getAlias($) {
    const hasAlias = $.querySelectorAll('#mw-content-text p').some(
      (p) =>
        -1 <
        HTMLtoString(p.innerHTML)
          .trim()
          .toLowerCase()
          .indexOf('most commonly refers to'),
    );

    const aliasList = [];

    if (hasAlias) {
      const liList = $.querySelectorAll('#mw-content-text ul li');

      for (const li of liList) {
        // if innerHTML start with opening a tag
        if (li.innerHTML.trim().indexOf('<a') === 0) {
          if (
            !li.classNames.some(
              (className) => className.indexOf('toclevel') === 0,
            )
          ) {
            aliasList.push(
              HTMLtoString(li.querySelector('a').innerHTML).trim(),
            );
          }
        }
      }
    }

    return aliasList;
  },

  getFromCard($, name) {
    const elements = Array.from($.querySelectorAll('table.infobox.vcard tr'));

    for (const tr of elements) {
      if (tr.querySelector('th')?.innerHTML.toLowerCase().trim() === name) {
        for (const child of tr.querySelector('td').childNodes) {
          if (child.text && /\d+/.test(child.text)) {
            return HTMLtoString(child.text)
              .trim()
              .replace(/^\(/, '')
              .replace(/\)$/, '');
          }
        }
      }
    }
  },

  getBirthDate($) {
    return fromWiki.getFromCard($, 'born');
  },

  getDeathDate($) {
    return fromWiki.getFromCard($, 'died');
  },
};

export async function loadWikiPedia(
  name,
) {
  return await (wikiCache[name] = wikiCache[name] || loadWikiPedia._load(name));
}

loadWikiPedia._load = async (name) => {  
  const apiURL = `https://cloud.google.com/run/docs/quickstarts/build-and-deploy/python`;
  // const apiURL = `/api/dbpedia/search`;
  // const apiURL = `/api/read_wkpd?name=${encodeURIComponent(name)}`;
  // const response = await fetch(apiURL);
  fetch('https://jsonplaceholder.typicode.com/users')
    .then(res => res.json())
    .then(json => {
        console.log("First user in the array:");
        console.log(json[0]);
        console.log("Name of the first user in the array:");
        console.log(json[0].name);
    })

  // if (response.status !== 200) return null;

  // const text = await response.text();
  // const $ = parseHTML(text);

  // console.log("text = ", text);

  // return {
  //   title: fromWiki.getTitle($),
  //   aliasList: fromWiki.getAlias($),
  //   birthDate: fromWiki.getBirthDate($),
  //   deathDate: fromWiki.getDeathDate($),
  //   coordinate: fromWiki.getCoordinate($),
  // };
};

const useWikiPedia = (wikiName) => {
  const [wikiData, setWikiData] = useState(null);

  useEffect(() => {
    const name = wikiName.trim();
    if (name) loadWikiPedia(name).then(setWikiData);
  }, [wikiName]);

  return wikiData;
};


const OptionalInput = ({
  value,
  setter,
  id,
  placeholderName,
  label,
}) => {
  const onChange = useCallback(
    ({ target }) => setter(target.value),
    [setter],
  );

  if (!value) return <></>;

  return (
    <p>
      <label htmlFor={id}>{label}: </label>
      <input
        type="text"
        placeholder={`Type ${placeholderName} here...`}
        id={id}
        value={value}
        onChange={onChange}
      />
    </p>
  );
};


const OptionalNumberInput = ({
  value,
  setter,
  ...props
}) => {
  return (
    <OptionalInput
      {...props}
      value={String(value || '')}
      setter={useCallback((newValue) => {
        if (Number.isFinite(+newValue)) {
          setter(+newValue);
        }
      }, [])}
    />
  );
};


const AliasSuggestion = ({
  list,
  onClickButton,
}) => {
  const buttons = useMemo(
    () =>
      list.map((alias, index) => (
        <button
          key={`alias-${index}`}
          onClick={(event) => {
            event.preventDefault();
            onClickButton(alias);
          }}
        >
          {alias}
        </button>
      )),
    [list],
  );

  if (!list.length) return <></>;

  return (
    <details open={list.length < 6}>
      <summary>Did you find..?</summary>
      {buttons}
    </details>
  );
};

function importRecord({
  longitude,
  latitude,
  deathDate,
  birthDate,
  title,
  recordType,
  recordSubType,
}){
  console.log({
    longitude,
    latitude,
    deathDate,
    birthDate,
    title,
    recordType,
    recordSubType,
  });
}

const Automator = () => {
  const [recordType, setRecordType] = useState('');

  const [recordSubType, setRecordSubType] = useState(
    (recordTypeNames[recordType || 'event'] || [])[0],
  );

  const [_wikiName, setWikiName] = useState('');
  const [title, setTitle] = useState('');
  const [aliasList, setAliasList] = useState([]);
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [longitude, setLongitude] = useState();
  const [latitude, setLatitude] = useState();
  const [wikiName] = useDebounce(_wikiName, 500);
  const wikiData = useWikiPedia(wikiName);

  const reset = useCallback(() => {
    setTitle('');
    setBirthDate('');
    setDeathDate('');
    setAliasList([]);
    setLongitude(undefined);
    setLatitude(undefined);
  }, []);

  useEffect(() => {
    if (!wikiData) return setTitle('Data not found');
    setTitle(wikiData.title);
    setBirthDate(wikiData.birthDate || '');
    setDeathDate(wikiData.deathDate || '');
    setAliasList(wikiData.aliasList);
    setLongitude(wikiData.coordinate?.longitude);
    setLatitude(wikiData.coordinate?.latitude);
  }, [wikiData]);

  useEffect(() => {
    if (!wikiName.trim()) reset();
    if (wikiName !== _wikiName) {
      reset();
      setTitle('Loading...');
    }
  }, [wikiName, _wikiName]);

  return (
    <>
      <label htmlFor="wikiName">WikiPedia name: </label>
      <input
        type="text"
        id="wikiName"
        placeholder="Type Wikipedia name here..."
        value={_wikiName}
        onChange={({ target }) => setWikiName(target.value)}
      />

      <hr />

      <label htmlFor="recordType">Record type: </label>
      <select
        id="recordType"
        onChange={useCallback(({ target }) => {
          setRecordType(target.selectedOptions[0].value);
        }, [])}
      >
        <option value="">Please select subtype</option>
        {useMemo(
          () =>
            (Object.keys(recordTypeNames)).map((key) => (
              <option value={key} key={`record-main-type-${key}`}>
                {key}
              </option>
            )),
          [],
        )}
      </select>

      {recordType && (
        <select
          id="recordType"
          onChange={({ target }) => {
            setRecordSubType(target.selectedOptions[0].value);
          }}
        >
          <option>Please select subtype</option>
          {(recordTypeNames[recordType || 'event']).map(
            (key) => (
              <option value={key} key={`record-sub-type-${key}`}>
                {key}
              </option>
            ),
          )}
        </select>
      )}

      <hr />

      <AliasSuggestion list={aliasList} onClickButton={setWikiName} />

      <OptionalInput
        label="Name"
        id="name"
        placeholderName="fullname"
        value={title}
        setter={setTitle}
      />

      <OptionalInput
        label="Born"
        id="birthDate"
        placeholderName="birth date"
        value={birthDate}
        setter={setBirthDate}
      />

      <OptionalInput
        label="Died"
        id="deathDate"
        placeholderName="death date"
        value={deathDate}
        setter={setDeathDate}
      />

      <OptionalNumberInput
        label="Latitude"
        id="latitude"
        placeholderName="latitude"
        value={latitude}
        setter={setLatitude}
      />

      <OptionalNumberInput
        label="Longitude"
        id="longitude"
        placeholderName="longitude"
        value={longitude}
        setter={setLongitude}
      />

      <hr />
      <button
        onClick={() => {
          importRecord({
            longitude,
            latitude,
            deathDate,
            birthDate,
            title,
            recordType,
            recordSubType,
          });
        }}
      >
        Import
      </button>
    </>
  );
};

export default Automator;
