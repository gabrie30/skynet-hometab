import React from 'react';

const Navbar = () => {

  return (
    <div className="navbar">
      <div className="nav-button-left">
        <div className="nav-button-text-left"><a className="nav-button" target="_blank" href="https://westfieldlabs.okta.com/app/UserHome">okta</a></div>
      </div>
      <div className="nav-button-right">
        <div className="nav-button-text-right"><a className="nav-button" target="_blank" href="http://www.gmail.com">gmail</a></div>
      </div>
    </div>
  );
};

export default Navbar;
