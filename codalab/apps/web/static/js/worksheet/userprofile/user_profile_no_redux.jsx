import { connect } from 'react-redux';
import React from 'react';
import PropTypes from 'prop-types';
import {
  Container,
  Header
} from 'semantic-ui-react';
import {
  fetchWorksheetsOfUser,
  fetchUser,
} from './actions.jsx';
import prettyBytes from 'pretty-bytes';
import update from 'immutability-helper';

class UserProfilePresentation extends React.Component {
  render() {
    const props = this.props;
    let {user_name, first_name, last_name, affiliation, disk_used, time_used} = props.user.data.attributes;

    const ifShowingLoggedInUser = (components) => {
      if (props.isLoggedInUser) {
        return components;
      }
      return null;
    };

    return (
      <Container>
        <Header as="h1">
          <img src="/static/img/icon_mini_avatar.png" className="mini-avatar cl-userprofile-usericon"/>
          { first_name } { last_name } ({ user_name })
        </Header>
        {ifShowingLoggedInUser(
        <div>
          <div>
            Disk usage: {disk_used}
          </div>
          <div>
            Time usage: {time_used} s
          </div>
        </div>
        )}
        <Header as='h3'>
          { affiliation }
        </Header>
        <Header as='h3'>
          Worksheets
        </Header>
        <div className="ws-item">
          <div className="type-table table-responsive table-striped">
            <table className='table table-striped'>
              <tbody>
              {props.worksheets.data.map((ws) => (
                 <tr key={ ws.attributes.uuid }>
                   <td>
                     <span style={{ marginRight: '5px' }}>
                       <a href={`/worksheets/${ws.attributes.uuid}`}>
                         { ws.attributes.title }
                       </a>
                     </span>
                     (
                       <a href={`/worksheets/${ws.attributes.uuid}`}>
                         { ws.attributes.name }
                       </a>
                     )
                   </td>
                 </tr>
              ))}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    )
  }
}

UserProfilePresentation.propTypes = {
  worksheets: PropTypes.object.isRequired,
  user: PropTypes.object.isRequired,
  userProfileIsOfLoggedInUser: PropTypes.bool.isRequired,
};

const clFetch = ({ url, currentState, setState, key, context = {}, callback = () => {} }) => {
  setState(update(currentState(), {
    [key]: {
      isFetching: {
        $set: true
      },
      context: {
        $set: context
      }
    }
  }));

  fetch(url, {
    credentials: 'same-origin',
  }).then(
    (response) => {
      if (response.status >= 400) {
        throw new Error('Bad response from server');
      }
      return response.json();
    }
  ).then(
    (json) => {
      setState(update(currentState(), {
        [key]: {
          isFetching: {
            $set: false,
          },
          results: {
            $set: json
          }
        }
      }), () => {
        callback();
      });
    }
  ).catch(
    (error) => console.error(error)
  );
};

/**
State: {
  worksheets: ClRequest(context={}),
  user: ClRequest(context={userId: String}),
}

ClRequest: {
  isFetching: Boolean,
  results: JsonApiResponse,
  context: JSON object,
}
If `isFetching` is true, `result` may be null and/or outdated.
If `isFetching` is false, `result` is a valid JsonApiResponse and the latest result.
`context` is a vanilla JSON with arbitrary key-value pairs.

JsonApiResponse: {
  data: Array,
  meta: {
    version: String,
  }
}
 */

class JsonApiResponse {
  constructor(json = {}) {
  }
}

class UserProfile extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      worksheets: {
        isFetching: true,
      },
      user: {
        isFetching: true,
      },
    };

    this.loadUserProfile = this.loadUserProfile.bind(this);
    this.dataIsLoaded = this.dataIsLoaded.bind(this);
  }

  componentDidMount() {
    this.loadUserProfile();
  }

  dataIsLoaded() {
    const state = this.state;

    return !state.worksheets.isFetching && !state.user.isFetching;
  }

  loadUserProfile() {
    const self = this;

    // get the user ID from the url
    let userId = this.props.match.params.userId;
    let urlForUserData, urlForWorksheetData;
    if (userId) {
      urlForUserData = `/rest/users/${userId}`;
      urlForWorksheetData = `/rest/worksheets?keywords=${encodeURIComponent(`owner=${userId}`)}`;
    } else {
      urlForUserData = `/rest/user`;
      urlForWorksheetData = `/rest/worksheets?keywords=${encodeURIComponent('.mine')}`
    }

    clFetch({
      url: urlForWorksheetData,
      currentState: () => self.state,
      setState: (newState, callback) => self.setState(newState, callback),
      key: 'worksheets',
      context: { userId },
      callback: () => console.log(self.state)
    });

    clFetch({
      url: urlForUserData,
      currentState: () => self.state,
      setState: (newState, callback) => self.setState(newState, callback),
      key: 'user',
      context: { userId },
      callback: () => console.log(self.state),
    });
  }

  render() {
    const state = this.state
    if (this.dataIsLoaded()) {
      return (
        <UserProfilePresentation 
          worksheets={this.state.worksheets.results}
          user={this.state.user.results}
          userProfileIsOfLoggedInUser={this.props.match.params.userId ? true : false}
        />
      );
    } else {
      return null;
    }
  }
}

UserProfile.propTypes = {
  match: PropTypes.shape({
    params: PropTypes.shape({
      // `userId` is null if showing the profile of the current user,
      // whereas it is a string representing a user's ID otherwise
      userId: PropTypes.string
    })
  })
};

export {
  UserProfile
};