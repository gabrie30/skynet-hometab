import React from 'react';

const Monitoring = (props) => {

  return (
    <div className="monitoring_links">
      <div className="link_heading"> Logs/Monitoring </div>
      <ul>
        {Object.keys(props.links).map(function(key){
          return <li className="link"><a href={props.links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default Monitoring;
