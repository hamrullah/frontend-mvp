import React, { useState,useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
//import '../../styles/';

const AddProject = () => {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedGoogle, setSelectedGoogle] = useState("");
  const [selectedUser, setSelectedUser] = useState("0");
  const [projectStart, setProjectStart] = useState("");
  const [projectEnd, setProjectEnd] = useState("");
  const [keywords, setKeywords] = useState([""]);
  const [msg, setMsg] = useState("");
  const [listGoogle, setListGoogle] = useState([]); 
  const [listUser, setListUser] = useState([]);
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  // Fetch project data from the API
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get('http://202.78.200.40:5000/list-google');
        setListGoogle(response.data); // Set the fetched projects to state
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    const fetchUser = async () => {
      try {
        const response = await axios.get('http://202.78.200.40:5000/users');
        setListUser(response.data); // Set the fetched projects to state
      } catch (error) {
        console.error('Error fetching projects:', error);
      }
    };

    fetchProjects();
    fetchUser();
  }, []);

  const saveProject = async (e) => {
    e.preventDefault();
    try {
      const keywordObjects = keywords
        .filter(keyword => keyword !== "") // Exclude empty strings
        .map(keyword => ({ keyword }));

      await axios.post("http://202.78.200.40:5000/create-project", {
        nameProject: 'SEO',
        domain: domain,
        typeProject: selectedType,
        projectStart: projectStart,
        projectEnd: projectEnd,
        nameGoogle : selectedGoogle,
        detail: keywordObjects,
        reqUserId : selectedUser // Exclude empty strings
      });
      navigate("/projects");
    } catch (error) {
      if (error.response) {
        setMsg(error.response.data.msg);
      }
    }
  };

  const handleTypeChange = (e) => {
    setSelectedType(e.target.value);
  };
  const handleGooleChange = (e) => {
    setSelectedGoogle(e.target.value);
  };

  const handleUserChange = (e) => {
    setSelectedUser(e.target.value);
  };

  const handleKeywordChange = (index, event) => {
    const newKeywords = [...keywords];
    newKeywords[index] = event.target.value;
    setKeywords(newKeywords);
  };

  const addKeywordField = () => {
    setKeywords([...keywords, ""]);
  };

  const removeKeywordField = (index) => {
    const newKeywords = [...keywords];
    newKeywords.splice(index, 1);
    setKeywords(newKeywords);
  };

  return (
    <div>
      <span><br></br></span>
      <h1 className="title">Project</h1>
      <h2 className="subtitle">Add New Project</h2>
      <div className="card is-shadowless">
        <div className="card-content">
          <div className="content">
            <form onSubmit={saveProject}>
              <p className="has-text-centered">{msg}</p>

              {user && user.role === "admin" && (
                  <div className="field">
                    <label className="label">Customer</label>
                    <div className="control">
                      <select
                        id="projectGoogle"
                        value={selectedUser}
                        onChange={handleUserChange}
                        className="input"
                        required
                      >
                        <option value="" disabled>-Select-</option>
                        {listUser.map((ls) => (
                          <option key={ls.id} value={ls.id}>
                            {ls.name + ' ( ' + ls.role + ' )'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

              {/* Type Project Select */}
              <div className="field">
                <label className="label">Google</label>
                <div className="control">
                  <select
                    id="projectGoogle"
                    value={selectedGoogle}
                    onChange={handleGooleChange}
                    className="input"
                    required
                  >
                    <option value="" disabled>-Select-</option>
                    {listGoogle.map((ls) => (
                      <option key={ls.id} value={ls.url_link}>
                        {ls.negara + ' ( ' + ls.url_link + ' )'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              

              {/* Domain Input */}
              <div className="field">
                <label className="label">Domain</label>
                <div className="control">
                  <input
                    type="text"
                    className="input"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="Domain"
                    required
                  />
                </div>
              </div>

              {/* Type Project Select */}
              <div className="field">
                <label className="label">Type Project</label>
                <div className="control">
                  <select
                    id="projectType"
                    value={selectedType}
                    onChange={handleTypeChange}
                    className="input"
                    required
                  >
                    <option value="" disabled>-Select-</option>
                    <option value="1">Submission</option>
                    <option value="2">Token</option>
                  </select>
                </div>
              </div>

              {/* Project Start Input */}
              <div className="field">
                <label className="label">Project Start</label>
                <div className="control">
                  <input
                    type="date"
                    className="input"
                    value={projectStart}
                    onChange={(e) => setProjectStart(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Project End Input */}
              <div className="field">
                <label className="label">Project End</label>
                <div className="control">
                  <input
                    type="date"
                    className="input"
                    value={projectEnd}
                    onChange={(e) => setProjectEnd(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Keywords Input */}
              <div className="field">
                <label className="label">Keywords</label>
                {keywords.map((keyword, index) => (
                  <div key={index} className="field has-addons">
                    <div className="control is-expanded">
                      <input
                        type="text"
                        className="input"
                        value={keyword}
                        onChange={(e) => handleKeywordChange(index, e)}
                        placeholder={`Keyword ${index + 1}`}
                      />
                    </div>
                    <div className="control">
                      <button
                        type="button"
                        className="button is-danger"
                        onClick={() => removeKeywordField(index)}
                        disabled={keywords.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <div className="buttons-container"> {/* New div for buttons */}
                  <button
                    type="button"
                    className="button is-link is-small mt-2"
                    onClick={addKeywordField}
                  >
                    Add Keyword
                  </button>
                  <button type="submit" className="button is-success mt-2">
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProject;
