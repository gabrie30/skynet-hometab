import React from 'react';

const Github = () => {

  let links = {
    "Westfield Org":"https://github.com/westfield",
    "Operations Org":"https://github.com/westfieldoperations",
    "Sandbox Public":"https://github.com/wf-sandbox-public",
    "Sandbox Private":"https://github.com/wf-sandbox-private",
    "Github Status Page":"https://status.github.com/graphs/past_day",
  }

  return (
    <div className="monitoring_links">
      <div className="link_heading"> Github </div>
      <ul>
        {Object.keys(links).map(function(key){
          return <li className="link"><a target="_blank" href={links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default Github;
