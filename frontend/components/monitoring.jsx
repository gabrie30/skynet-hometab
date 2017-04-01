import React from 'react';

const Monitoring = () => {

  let links = { "Google":"https://www.google.com", "Facebook":"www.facebook.com"}

  return (
    <div className="monitoring_links">
      <h3> Monitoring </h3>
      <ul>
        {Object.keys(links).map(function(key){
          return <li><a target="_blank" href={links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default Monitoring;
