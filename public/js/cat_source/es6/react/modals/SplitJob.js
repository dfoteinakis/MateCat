
class SplitJobModal extends React.Component {


    constructor(props) {
        super(props);
        var arraySplit = this.calculateSplitComputation(2);
        this.state = {
            numSplit: 2,
            wordsArray: arraySplit,
            splitChecked: false,
            showLoader: false,
            showError: false
        };
    }

    closeModal() {
        APP.ModalWindow.onCloseModal();
    }

    changeSplitNumber() {
        var arraySplit = this.calculateSplitComputation(this.splitSelect.value);
        this.setState({
            numSplit: this.splitSelect.value,
            wordsArray: arraySplit,
            splitChecked: false,
            showLoader: false
        });
    }

    calculateSplitComputation(numSplit) {
        let numWords, array = [];
        let total = Math.round(this.props.job.get('stats').get('TODO'));
        if (total === 0 ) {
            total = Math.round(this.props.job.get('stats').get('TOTAL'));
        }
        let wordsXjob = Math.floor(total / numSplit);
        let diff = total - (wordsXjob * numSplit);
        for (let i = 0; i < numSplit; i++) {
            numWords = wordsXjob;
            if (i < diff) {
                numWords++;
            }

            array.push(numWords);
        }
        return array;
    }

    changeInputWordsCount(indexChanged , e) {
        let arraySplit = this.state.wordsArray;
        arraySplit[indexChanged] = parseInt(e.target.value);
        this.setState({
            wordsArray: arraySplit,
            splitChecked: false,
            showLoader: false
        });

    }

    checkSplitComputation() {

        let sum = this.state.wordsArray.reduce((a, b) => a + b, 0);
        let diff = 0;
        if ( Math.round(this.props.job.get('stats').get('TODO')) !== 0) {
            diff = sum - Math.round(this.props.job.get('stats').get('TODO'));
        } else {
            diff = sum - Math.round(this.props.job.get('stats').get('TOTAL'));
        }
        if ( diff != 0 ) {
            return {
                difference: diff,
                sum: sum
            }
        }

    }

    checkSplitJob() {
        let self = this;
        this.setState({
            showLoader: true
        });
        UI.checkSplitRequest(this.props.job.toJS(), this.props.project.toJS(), this.state.numSplit, this.state.wordsArray)
            .done(function (d) {
                let arrayChunks = [];
                if (d.data && d.data.chunks) {

                    d.data.chunks.forEach(function (item, index) {
                        if( typeof d.data.chunks[index] == 'undefined' ) {
                            arrayChunks[index] = 0;
                        } else {

                            if ( config.split_based_on_raw_word_count ) {
                                arrayChunks[index] = parseInt( d.data.chunks[index].raw_word_count );
                            }
                            else {
                                arrayChunks[index] = parseInt( d.data.chunks[index].eq_word_count );
                            }
                        }
                    })
                }
                if ((typeof d.errors != 'undefined') && (d.errors.length) ) {
                    self.errorMsg = d.errors[0].message;
                    self.setState({
                        showError: true,
                        showLoader: false,
                        splitChecked: false
                    });
                    return;
                }
                self.setState({
                    wordsArray: arrayChunks,
                    splitChecked: true,
                    showLoader: false
                });
        });
    }

    confirmSplitJob() {
        let self = this;
        this.setState({
            showLoader: true
        });
        let array = this.state.wordsArray.filter(function (item) {
            return item > 0;
        });

        UI.confirmSplitRequest(this.props.job.toJS(), this.props.project.toJS(), array.length, array)
            .done(function (d) {
                if (d.data && d.data.chunks) {
                    UI.reloadProjects();
                    APP.ModalWindow.onCloseModal();
                }
                if ((typeof d.errors != 'undefined') && (d.errors.length) ) {
                    self.errorMsg = d.errors[0].message;
                    self.setState({
                        showError: true,
                        showLoader: false,
                        splitChecked: false
                    });
                }

        });
    }

    getJobParts() {
        let html = [];
        for (let i = 0; i < this.state.numSplit; i++) {
            let value = (this.state.wordsArray[i] && parseInt(this.state.wordsArray[i]) != 0) ? this.state.wordsArray[i] : 0;
            let disableClass = (value > 0 ) ? '' : 'void';
            let emptyClass = (value == 0 && this.state.splitChecked) ? 'empty' : '';
            let part = <li key={"split-" + i} className={disableClass}>
                        <div><h4>Part {i+1}</h4></div>
                        <div className="job-details">
                            <div className="job-perc"><p>

                                {!this.state.splitChecked? (<span className="aprox">Approx. words:</span>) : ('')}

                                <span className="correct none">Words:</span>
                            </p>
                                <input type="text" className={"input-small " + emptyClass} value={value}
                                onChange={this.changeInputWordsCount.bind(this, i)}/>
                            </div>
                        </div>
                    </li>;
            html.push(part);
        }
        return html;
    }

    render() {
        let splitParts = this.getJobParts();
        let checkSplit = this.checkSplitComputation();
        let showSplitDiffError =  !!(checkSplit);
        let errorLabel =  (checkSplit && checkSplit.difference < 0) ? 'Words remaining' : 'Words exceeding';
        let errorSplitDisableClass = (checkSplit) ? "disabled" : "";
        let totalWords = (this.props.job.get('stats').get('TODO') > 0 ) ? this.props.job.get('stats').get('TODO_FORMATTED') : this.props.job.get('stats').get('TOTAL_FORMATTED')

        return <div className="modal popup-split">
            <div className="popup" id="split-modal-cont">
                <div className="splitbtn-cont">
                    <h3><span className="popup-split-job-id">({this.props.job.get('id')}) </span>
                        <span className="popup-split-job-title">{this.props.job.get('sourceTxt') + " > " + this.props.job.get('targetTxt')}</span>
                    </h3>
                    <span className="label left">Split in</span>
                    <select name="popup-splitselect" className="splitselect left"
                            ref={(select) => this.splitSelect = select} onChange={this.changeSplitNumber.bind(this)}>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                        <option value="11">11</option>
                        <option value="12">12</option>
                        <option value="13">13</option>
                        <option value="14">14</option>
                        <option value="15">15</option>
                        <option value="16">16</option>
                        <option value="17">17</option>
                        <option value="18">18</option>
                        <option value="19">19</option>
                        <option value="20">20</option>
                        <option value="21">21</option>
                        <option value="22">22</option>
                        <option value="23">23</option>
                        <option value="24">24</option>
                        <option value="25">25</option>
                        <option value="26">26</option>
                        <option value="27">27</option>
                        <option value="28">28</option>
                        <option value="29">29</option>
                        <option value="30">30</option>
                        <option value="31">31</option>
                        <option value="32">32</option>
                        <option value="33">33</option>
                        <option value="34">34</option>
                        <option value="35">35</option>
                        <option value="36">36</option>
                        <option value="37">37</option>
                        <option value="38">38</option>
                        <option value="39">39</option>
                        <option value="40">40</option>
                        <option value="41">41</option>
                        <option value="42">42</option>
                        <option value="43">43</option>
                        <option value="44">44</option>
                        <option value="45">45</option>
                        <option value="46">46</option>
                        <option value="47">47</option>
                        <option value="48">48</option>
                        <option value="49">49</option>
                        <option value="50">50</option>
                    </select>
                    <span className="label left">Jobs</span>
                </div>
                <div className="popup-box split-box3">
                    <ul className="jobs">
                        {splitParts}
                    </ul>
                    <div className="total">
                        <p className="wordsum">Total words: <span className="total-w">{totalWords}</span></p>
                        {showSplitDiffError ? (<p className="error-count current">Current count: <span className="curr-w">{APP.addCommas(checkSplit.sum)}</span></p>)
                            : ('')}

                        {showSplitDiffError ? (<p className="error-count"><span className="txt">{errorLabel}</span>: <span className="diff-w">{APP.addCommas(Math.abs(checkSplit.difference))}</span></p>)
                            : ('')}
                    </div>
                    {this.state.showError ? (
                            <div className="error-message">
                                <p>{this.errorMsg? (this.errorMsg) : ('Error, please try again or contact support@matecat.com')}</p>
                            </div>
                    ) :('')}

                    <div className="cl"></div>
                    <div className="btnsplit">


                        {showSplitDiffError ? (
                            <div id="exec-split" className="uploadbtn loader">
                                {this.state.showLoader ? (
                                <span className="uploadloader"/>
                                    ):('')}
                                <div className="ui button-modal blue disabled">Check</div>
                            </div>
                                ) : ((this.state.splitChecked) ? ('') : (
                                <div id="exec-split" className="uploadbtn loader" onClick={this.checkSplitJob.bind(this)}>
                                    {this.state.showLoader ? (
                                    <span className="uploadloader"/>
                                        ):('')}
                                    <div className="ui button-modal blue">Check</div>
                                </div>
                                ))}


                        {!showSplitDiffError && this.state.splitChecked ? (
                            <div id="exec-split-confirm" className="uploadbtn">
                                <div className="ui button-modal blue splitbtn" onClick={this.confirmSplitJob.bind(this)}>Confirm</div>
                            </div>) : ('')}

                        <div className="ui button-modal grey margin right-30" onClick={this.closeModal.bind(this)}>Cancel</div>
                    </div>
                </div>
                {/*<!-- END DIV SPLIT BOX -->*/}
            </div>
            {/*<!-- END DIV POPUP-SPLIT INTERNO -->*/}
        </div>;
    }
}


export default SplitJobModal ;
