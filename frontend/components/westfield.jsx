import React from 'react';

const Westfield = () => {

  let links = { "Workday":"https://www.google.com", "Facebook":"www.facebook.com"}

  return (
    <div className="monitoring_links">
      <h3> Westfield </h3>
      <ul>
        {Object.keys(links).map(function(key){
          return <li><a target="_blank" href={links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default Westfield;
