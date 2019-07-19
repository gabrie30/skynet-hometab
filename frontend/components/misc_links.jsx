import React from 'react';

const MiscLinks = (props) => {

  return (
    <div className="monitoring_links">
      <div className="link_heading"> Misc. Links </div>
      <ul>
        {Object.keys(props.links).map(function(key){
          return <li className="link"><a href={props.links[key]}>{key}</a></li>
        })}
      </ul>
    </div>
  );
};

export default MiscLinks;
