import React from 'react';

const Title = () => {
  var imageStyle = {
    height: "130px"
  };

  return (
    <div className="title">
      <h3>Unity DevOps</h3>
      <img style={imageStyle} src="http://cityonfire.com/wp-content/uploads/2011/04/Skynet.jpg"></img>
    </div>
  );
};

export default Title;
