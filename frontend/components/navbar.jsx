import React from 'react';

const Navbar = (props) => {
  var leftButton = props.links.leftButton
  var rightButton = props.links.rightButton

  return (
    <div className="navbar">
      <div className="nav-button-left">
        <div className="nav-button-text-left"><a className="nav-button" href={Object.values(leftButton)[0]}>{Object.keys(leftButton)[0]}</a></div>
      </div>
      <div className="nav-button-right">
        <div className="nav-button-text-right"><a className="nav-button" href={Object.values(rightButton)[0]}>{Object.keys(rightButton)[0]}</a></div>
      </div>
    </div>
  );
};

export default Navbar;
