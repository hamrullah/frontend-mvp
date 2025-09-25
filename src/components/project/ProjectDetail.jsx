import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const ProjectDetail = () => {
    const [name, setName] = useState("");
    const [domain, setDomain] = useState("");
    const [selectedType, setSelectedType] = useState("");
    const [projectStart, setProjectStart] = useState("");
    const [projectEnd, setProjectEnd] = useState("");
    const [keywords, setKeywords] = useState([]);
    const [msg, setMsg] = useState("");

    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();
    const { id } = useParams();

    useEffect(() => {
        const getProjectById = async () => {
            try {
                const response = await axios.get(`http://202.78.200.40:5000/list-project/${id}`);
                setName(response.data.name_google);
                setDomain(response.data.domain);
                setProjectStart(response.data.project_start);
                setProjectEnd(response.data.project_end);
                
                const initialKeywords = response.data.trx_project_details.map(detail => detail.keyword_name);
                setKeywords(initialKeywords);
            } catch (error) {
                if (error.response) {
                    setMsg(error.response.data.msg);
                }
            }
        };
        getProjectById();
    }, [id]);

    const handleSearch = async () => {
        if (!keywords.length || !domain) {
            setError('Both keywords and domain are required');
            return;
        }

        setSearchLoading(true);
        setError('');
        setResults(null);

        const keywordArray = keywords.filter(k => k.trim()).map(k => k.trim()); // Filter out empty keywords

        try {
            const response = await axios.post('http://202.78.200.40:5000/Scrape', {
                keywords: keywordArray,
                domain,
                nameGoogle : name
            });

            const searchResults = response.data.results;
            setResults(searchResults);

            await axios.post('http://202.78.200.40:5000/save-results', {
                results: searchResults,
                domain
            });

        } catch (err) {
            setError('Error fetching search results');
        } finally {
            setSearchLoading(false);
        }
    };

    const updateProject = async (e) => {
        e.preventDefault();
        try {
            await axios.patch(`http://202.78.200.40:5000/projects/${id}`, {
                name,
                domain,
                project_start: projectStart,
                project_end: projectEnd,
                type: selectedType,
                trx_project_details: keywords.map(keyword => ({ keyword_name: keyword }))
            });
            navigate("/products");
        } catch (error) {
            if (error.response) {
                setMsg(error.response.data.msg);
            }
        }
    };

    const handleTypeChange = (e) => {
        setSelectedType(e.target.value);
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
            <h1 className="title">Project Details</h1>
            <h2 className="subtitle">Edit Project</h2>
            
            <div className="card is-shadowless">
                <div className="card-content">
                    <div className="content">
                        <form onSubmit={updateProject}>
                            <p className="has-text-centered">{msg}</p>

                            {/* Project Name Input */}
                            <div className="field">
                                <label className="label">Google</label>
                                <div className="control">
                                    <input
                                        type="text"
                                        className="input"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Project Name"
                                        required
                                    />
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
                                        <option value="" disabled>Select type</option>
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
                                        type="text"
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
                                        type="text"
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
                                <div className="buttons-container">
                                    <button
                                        type="button"
                                        className="button is-link is-small mt-2"
                                        onClick={addKeywordField}
                                    >
                                        Add Keyword
                                    </button>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="field">
                                <div className="control">
                                    <button type="submit" className="button is-success">
                                        Update Project
                                    </button> - 
                                    <button 
                                        onClick={handleSearch} 
                                        className="button is-success" 
                                        disabled={searchLoading}
                                    >
                                        {searchLoading ? 'Scraping...' : 'Scraping'}
                                    </button>
                                </div>
                            </div>

                            {loading && <p>Loading...</p>}
                            {error && <p className="has-text-danger">{error}</p>}

                            {results && (
                                <div className="results">
                                    {results.map((result, index) => (
                                        <div key={index}>
                                            <h4>Keyword: {result.keyword}</h4>
                                            {result.found ? (
                                                <p>
                                                    Domain found on page {result.page}, rank {result.rank}: <a href={result.link} target="_blank" rel="noopener noreferrer">{result.title}</a>
                                                </p>
                                            ) : (
                                                <p>Domain not found in the top 10 pages</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectDetail;
