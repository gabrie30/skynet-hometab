import React from 'react';

const MiscLinks = () => {

  let links = {
    "repl.it":"https://repl.it/languages/ruby",
    "regex101":"https://regex101.com/",
    "Safari Online":"http://my.safaribooksonline.com/",
    "localhost:3000":"localhost:3000",
  }

  return (
    <div className="monitoring_links">
      <div className="link_heading"> Misc. Links </div>
      <ul>
        {Object.keys(links).map(function(key){
          return <li className="link"><a target="_blank" href={links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default MiscLinks;
